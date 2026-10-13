package com.backlogd.api.connection.steam;

import com.backlogd.api.catalog.CatalogItem;
import com.backlogd.api.catalog.CatalogService;
import com.backlogd.api.connection.Connection;
import com.backlogd.api.connection.ConnectionRepository;
import com.backlogd.api.connection.Provider;
import com.backlogd.api.connection.steam.SteamClient.OwnedGame;
import com.backlogd.api.log.LogEntry;
import com.backlogd.api.log.LogEntryRepository;
import com.backlogd.api.log.LogStatus;
import com.backlogd.api.log.Platform;
import com.backlogd.api.media.Media;
import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Imports a Steam library. Status comes from playtime: played in the last two weeks = Playing,
 * played before = On hold, never launched = Backlog. Re-syncs refresh hours, and refresh status only
 * while the user hasn't decided it themselves (Beaten / Dropped are left alone).
 */
@Service
public class SteamImportService {

    private static final String CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps/";
    private static final Set<LogStatus> AUTO_STATUSES = EnumSet.of(LogStatus.PLANNED, LogStatus.PAUSED, LogStatus.IN_PROGRESS);

    private final SteamClient steam;
    private final CatalogService catalog;
    private final LogEntryRepository logs;
    private final ConnectionRepository connections;
    private final TransactionTemplate tx;

    public SteamImportService(SteamClient steam, CatalogService catalog, LogEntryRepository logs,
                              ConnectionRepository connections, PlatformTransactionManager txManager) {
        this.steam = steam;
        this.catalog = catalog;
        this.logs = logs;
        this.connections = connections;
        this.tx = new TransactionTemplate(txManager);
    }

    public record ImportResult(int total, int imported, int updated, int alreadyLogged) {
    }

    public ImportResult importLibrary(UUID userId, String profile) {
        String steamId = steam.resolveSteamId(profile);
        String persona = steam.personaName(steamId);
        List<OwnedGame> games = steam.ownedGames(steamId);
        return tx.execute(status -> persist(userId, steamId, persona, games));
    }

    private ImportResult persist(UUID userId, String steamId, String persona, List<OwnedGame> games) {
        List<LogEntry> existing = logs.findByUserIdAndMedia_KindOrderByUpdatedAtDesc(userId, MediaKind.GAME);
        Map<UUID, LogEntry> byMedia = new HashMap<>();
        Set<String> manualPcTitles = new HashSet<>();
        for (LogEntry e : existing) {
            byMedia.put(e.getMedia().getId(), e);
            if (e.getMedia().getSource() != MediaSource.STEAM && (e.getPlatform() == null || e.getPlatform() == Platform.PC)) {
                manualPcTitles.add(normalize(e.getMedia().getTitle()));
            }
        }

        int imported = 0;
        int updated = 0;
        int already = 0;
        for (OwnedGame game : games) {
            String appId = String.valueOf(game.appid());
            LogStatus status = statusFor(game);
            BigDecimal hours = hoursFor(game);
            Optional<Media> cached = catalog.findCached(MediaSource.STEAM, appId);
            LogEntry entry = cached.map(m -> byMedia.get(m.getId())).orElse(null);

            if (entry != null) {
                if (refresh(entry, status, hours)) {
                    updated++;
                } else {
                    already++;
                }
                continue;
            }
            if (manualPcTitles.contains(normalize(game.name()))) {
                already++;
                continue;
            }
            Media media = cached.orElseGet(() -> catalog.resolve(toItem(game)));
            LogEntry created = new LogEntry(userId, media);
            created.apply(status, null, Platform.PC, "Steam", null, hours, null, null, null);
            logs.save(created);
            byMedia.put(media.getId(), created);
            imported++;
        }

        Connection connection = connections.findByUserIdAndProvider(userId, Provider.STEAM)
                .orElseGet(() -> connections.save(new Connection(userId, Provider.STEAM, steamId)));
        connection.recordSync(steamId, persona,
                imported + " imported, " + updated + " updated, " + already + " unchanged");
        return new ImportResult(games.size(), imported, updated, already);
    }

    /** Applies fresh Steam hours (and status, if still automatic). Returns whether anything changed. */
    private static boolean refresh(LogEntry e, LogStatus steamStatus, BigDecimal steamHours) {
        LogStatus status = AUTO_STATUSES.contains(e.getStatus()) ? steamStatus : e.getStatus();
        BigDecimal hours = steamHours != null ? steamHours : e.getHours();
        boolean sameHours = hours == null ? e.getHours() == null : e.getHours() != null && hours.compareTo(e.getHours()) == 0;
        if (status == e.getStatus() && sameHours) {
            return false;
        }
        e.apply(status, e.getRating(), e.getPlatform(), e.getConsole(), e.getProgress(), hours,
                e.getStartedOn(), e.getFinishedOn(), e.getNotes());
        return true;
    }

    static LogStatus statusFor(OwnedGame g) {
        if (minutes(g.playtime2Weeks()) > 0) {
            return LogStatus.IN_PROGRESS;
        }
        return minutes(g.playtimeForever()) > 0 ? LogStatus.PAUSED : LogStatus.PLANNED;
    }

    static BigDecimal hoursFor(OwnedGame g) {
        int total = minutes(g.playtimeForever());
        return total <= 0 ? null
                : BigDecimal.valueOf(total).divide(BigDecimal.valueOf(60), 1, RoundingMode.HALF_UP);
    }

    private static int minutes(Integer m) {
        return m == null ? 0 : m;
    }

    /** "ELDEN RING™" and "Elden Ring" compare equal. */
    static String normalize(String title) {
        String noMarks = Objects.requireNonNullElse(title, "").replaceAll("[\u2122\u00AE\u00A9]", "");
        String plain = Normalizer.normalize(noMarks, Normalizer.Form.NFKD);
        return plain.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private static CatalogItem toItem(OwnedGame g) {
        String name = g.name() == null || g.name().isBlank() ? "Steam app " + g.appid() : g.name();
        return new CatalogItem(MediaKind.GAME, MediaSource.STEAM, String.valueOf(g.appid()), name, null,
                CDN + g.appid() + "/library_600x900.jpg", CDN + g.appid() + "/header.jpg", null, null, List.of());
    }
}
