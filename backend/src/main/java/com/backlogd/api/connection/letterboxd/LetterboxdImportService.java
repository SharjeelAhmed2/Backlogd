package com.backlogd.api.connection.letterboxd;

import com.backlogd.api.catalog.CatalogItem;
import com.backlogd.api.catalog.CatalogService;
import com.backlogd.api.catalog.MediaRef;
import com.backlogd.api.catalog.TmdbClient;
import com.backlogd.api.common.ApiException;
import com.backlogd.api.common.Titles;
import com.backlogd.api.connection.Connection;
import com.backlogd.api.connection.ConnectionRepository;
import com.backlogd.api.connection.Provider;
import com.backlogd.api.connection.letterboxd.LetterboxdExport.Film;
import com.backlogd.api.log.LogEntry;
import com.backlogd.api.log.LogEntryRepository;
import com.backlogd.api.log.LogStatus;
import com.backlogd.api.media.Media;
import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;

/**
 * Imports a Letterboxd export. Watched films become Watched (with rating, last watch date and review),
 * watchlist films become Watchlist. Films are matched on TMDB by title + year for posters and genres;
 * anything TMDB can't find is still imported as a manual entry. Films already in the log are skipped,
 * so uploading a newer export later only adds what's new.
 */
@Service
public class LetterboxdImportService {

    private static final Logger log = LoggerFactory.getLogger(LetterboxdImportService.class);
    private static final int PARALLEL_LOOKUPS = 6;

    private final TmdbClient tmdb;
    private final CatalogService catalog;
    private final LogEntryRepository logs;
    private final ConnectionRepository connections;
    private final TransactionTemplate tx;

    public LetterboxdImportService(TmdbClient tmdb, CatalogService catalog, LogEntryRepository logs,
                                   ConnectionRepository connections, PlatformTransactionManager txManager) {
        this.tmdb = tmdb;
        this.catalog = catalog;
        this.logs = logs;
        this.connections = connections;
        this.tx = new TransactionTemplate(txManager);
    }

    public record ImportResult(int total, int imported, int alreadyLogged, int unmatched) {
    }

    public ImportResult importExport(UUID userId, String filename, byte[] bytes) {
        if (!tmdb.isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Letterboxd import matches films on TMDB — add TMDB_API_KEY to backend/.env and restart");
        }
        LetterboxdExport export = LetterboxdExport.read(filename, bytes);

        Set<String> loggedTitles = new HashSet<>();
        Set<UUID> loggedMedia = new HashSet<>();
        for (LogEntry e : logs.findByUserIdAndMedia_KindOrderByUpdatedAtDesc(userId, MediaKind.FILM)) {
            loggedTitles.add(Titles.key(e.getMedia().getTitle(), e.getMedia().getReleaseYear()));
            loggedMedia.add(e.getMedia().getId());
        }
        List<Film> films = new ArrayList<>(export.films());
        List<Film> toMatch = films.stream().filter(f -> !loggedTitles.contains(Titles.key(f.name, f.year))).toList();
        Map<Film, Optional<CatalogItem>> matches = matchOnTmdb(toMatch);

        return tx.execute(status -> persist(userId, export.username(), films, loggedTitles, loggedMedia, matches));
    }

    private ImportResult persist(UUID userId, String username, List<Film> films, Set<String> loggedTitles,
                                 Set<UUID> loggedMedia, Map<Film, Optional<CatalogItem>> matches) {
        int imported = 0;
        int already = 0;
        int unmatched = 0;
        for (Film film : films) {
            if (loggedTitles.contains(Titles.key(film.name, film.year))) {
                already++;
                continue;
            }
            Optional<CatalogItem> match = matches.getOrDefault(film, Optional.empty());
            Media media = match.isPresent()
                    ? catalog.resolve(match.get())
                    : catalog.resolve(new MediaRef(MediaSource.MANUAL, null, MediaKind.FILM, film.name, film.year, null));
            // Two export rows can land on one TMDB film (e.g. alternate titles)
            if (!loggedMedia.add(media.getId())) {
                already++;
                continue;
            }
            if (match.isEmpty()) {
                unmatched++;
            }
            LogEntry entry = new LogEntry(userId, media);
            entry.apply(film.watched ? LogStatus.COMPLETED : LogStatus.PLANNED,
                    film.watched ? film.rating : null, null, null, null, null,
                    null, film.watched ? film.lastWatched : null, film.review);
            logs.save(entry);
            imported++;
        }

        String account = username == null ? "export" : username;
        Connection connection = connections.findByUserIdAndProvider(userId, Provider.LETTERBOXD)
                .orElseGet(() -> connections.save(new Connection(userId, Provider.LETTERBOXD, account)));
        connection.recordSync(account, username,
                imported + " imported, " + already + " already in your log"
                        + (unmatched > 0 ? ", " + unmatched + " without a TMDB match" : ""));
        return new ImportResult(films.size(), imported, already, unmatched);
    }

    /**
     * Looks every film up on TMDB, a few at a time. The first lookup runs alone so a bad API key fails
     * the whole import with a clear message; after that a film whose lookup fails is imported unmatched.
     */
    private Map<Film, Optional<CatalogItem>> matchOnTmdb(List<Film> films) {
        Map<Film, Optional<CatalogItem>> out = new HashMap<>();
        if (films.isEmpty()) {
            return out;
        }
        out.put(films.getFirst(), tmdb.match(films.getFirst().name, films.getFirst().year));

        Semaphore gate = new Semaphore(PARALLEL_LOOKUPS);
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            Map<Film, Future<Optional<CatalogItem>>> pending = new HashMap<>();
            for (Film film : films.subList(1, films.size())) {
                pending.put(film, pool.submit(() -> {
                    gate.acquire();
                    try {
                        return lookupWithRetry(film);
                    } finally {
                        gate.release();
                    }
                }));
            }
            for (Map.Entry<Film, Future<Optional<CatalogItem>>> e : pending.entrySet()) {
                try {
                    out.put(e.getKey(), e.getValue().get());
                } catch (ExecutionException ex) {
                    out.put(e.getKey(), Optional.empty());
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Import interrupted");
                }
            }
        }
        return out;
    }

    private Optional<CatalogItem> lookupWithRetry(Film film) throws InterruptedException {
        for (int attempt = 1; ; attempt++) {
            try {
                return tmdb.match(film.name, film.year);
            } catch (ApiException e) {
                if (attempt >= 3) {
                    log.warn("Giving up matching \"{}\" ({}) on TMDB: {}", film.name, film.year, e.getMessage());
                    return Optional.empty();
                }
                Thread.sleep(1000L * attempt);
            }
        }
    }
}
