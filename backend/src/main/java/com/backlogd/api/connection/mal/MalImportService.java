package com.backlogd.api.connection.mal;

import com.backlogd.api.catalog.AniListClient;
import com.backlogd.api.catalog.CatalogItem;
import com.backlogd.api.catalog.CatalogService;
import com.backlogd.api.common.ApiException;
import com.backlogd.api.connection.Connection;
import com.backlogd.api.connection.ConnectionRepository;
import com.backlogd.api.connection.Provider;
import com.backlogd.api.connection.mal.MalClient.ListStatus;
import com.backlogd.api.connection.mal.MalClient.MalEntry;
import com.backlogd.api.connection.mal.MalClient.Node;
import com.backlogd.api.log.LogEntry;
import com.backlogd.api.log.LogEntryRepository;
import com.backlogd.api.log.LogStatus;
import com.backlogd.api.media.Media;
import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaSource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Imports a public MyAnimeList anime list. Titles are matched to AniList by MAL id so they share
 * posters with searched titles; anything AniList doesn't know is kept as a MAL-sourced title.
 * Titles already in the user's log are left untouched.
 */
@Service
public class MalImportService {

    private static final BigDecimal TWO = BigDecimal.valueOf(2);

    private final MalClient mal;
    private final AniListClient aniList;
    private final CatalogService catalog;
    private final LogEntryRepository logs;
    private final ConnectionRepository connections;
    private final TransactionTemplate tx;

    public MalImportService(MalClient mal, AniListClient aniList, CatalogService catalog, LogEntryRepository logs,
                            ConnectionRepository connections, PlatformTransactionManager txManager) {
        this.mal = mal;
        this.aniList = aniList;
        this.catalog = catalog;
        this.logs = logs;
        this.connections = connections;
        this.tx = new TransactionTemplate(txManager);
    }

    public record ImportResult(int total, int imported, int alreadyLogged, int notOnAniList) {
    }

    public ImportResult importList(UUID userId, String rawUsername) {
        String username = rawUsername == null ? "" : rawUsername.trim();
        if (!username.matches("^[A-Za-z0-9_-]{2,16}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That doesn't look like a MyAnimeList username");
        }
        // Network calls happen outside the transaction; only the writes are transactional
        List<MalEntry> entries = mal.animeList(username).stream().filter(e -> e.listStatus() != null).toList();
        List<Integer> malIds = entries.stream().map(e -> e.node().id()).distinct().toList();
        Map<Integer, CatalogItem> matched = aniList.findByMalIds(malIds);
        return tx.execute(status -> persist(userId, username, entries, matched));
    }

    private ImportResult persist(UUID userId, String username, List<MalEntry> entries, Map<Integer, CatalogItem> matched) {
        Set<UUID> logged = new HashSet<>(logs.findMediaIdsByUserId(userId));
        int imported = 0;
        int already = 0;
        int fallback = 0;

        for (MalEntry e : entries) {
            CatalogItem item = matched.get(e.node().id());
            boolean onAniList = item != null;
            Media media = catalog.resolve(onAniList ? item : fromMal(e.node()));
            if (!logged.add(media.getId())) {
                already++;
                continue;
            }
            logs.save(toEntry(userId, media, e));
            imported++;
            if (!onAniList) {
                fallback++;
            }
        }

        Connection connection = connections.findByUserIdAndProvider(userId, Provider.MAL)
                .orElseGet(() -> connections.save(new Connection(userId, Provider.MAL, username)));
        connection.recordSync(username, username, imported + " imported, " + already + " already in your log");
        return new ImportResult(entries.size(), imported, already, fallback);
    }

    private static LogEntry toEntry(UUID userId, Media media, MalEntry e) {
        ListStatus ls = e.listStatus();
        LogStatus status = switch (ls.status() == null ? "" : ls.status()) {
            case "watching" -> LogStatus.IN_PROGRESS;
            case "completed" -> LogStatus.COMPLETED;
            case "on_hold" -> LogStatus.PAUSED;
            case "dropped" -> LogStatus.DROPPED;
            default -> LogStatus.PLANNED;
        };
        Integer episodes = media.getEpisodes() != null ? media.getEpisodes() : positive(e.node().numEpisodes());
        Integer progress = ls.episodesWatched();
        if (status == LogStatus.COMPLETED && episodes != null) {
            progress = episodes;
        } else if (progress != null && episodes != null && progress > episodes) {
            progress = episodes;
        }
        BigDecimal rating = ls.score() == null || ls.score() <= 0 ? null
                : BigDecimal.valueOf(ls.score()).divide(TWO);

        LogEntry entry = new LogEntry(userId, media);
        entry.apply(status, rating, null, null, progress, null, date(ls.startDate()), date(ls.finishDate()), null);
        return entry;
    }

    private static CatalogItem fromMal(Node n) {
        String poster = n.mainPicture() == null ? null
                : n.mainPicture().large() != null ? n.mainPicture().large() : n.mainPicture().medium();
        Integer year = n.startSeason() == null ? null : n.startSeason().year();
        return new CatalogItem(MediaKind.ANIME, MediaSource.MAL, String.valueOf(n.id()), n.title(), year,
                poster, null, null, positive(n.numEpisodes()), List.of());
    }

    private static Integer positive(Integer n) {
        return n == null || n <= 0 ? null : n;
    }

    /** MAL dates can be partial ("2019" or "2019-04"); only full dates are kept. */
    private static LocalDate date(String s) {
        if (s == null || s.length() != 10) {
            return null;
        }
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
