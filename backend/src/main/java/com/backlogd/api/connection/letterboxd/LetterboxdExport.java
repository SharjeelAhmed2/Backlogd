package com.backlogd.api.connection.letterboxd;

import com.backlogd.api.common.ApiException;
import com.backlogd.api.common.Titles;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Reads the export from Letterboxd (Settings → Data → Export your data): the ZIP, or a single CSV from it.
 * Files are joined on film name + year, because the URIs differ per file (diary rows link to the entry,
 * not the film).
 */
final class LetterboxdExport {

    /** Protects against oversized or malicious archives; a real export is a few MB at most. */
    private static final int MAX_FILE_BYTES = 25 * 1024 * 1024;
    private static final Set<String> SKIPPED_FOLDERS = Set.of("lists", "likes", "deleted", "orphaned");

    /** One film, merged across the export's files. */
    static final class Film {
        final String name;
        final Integer year;
        boolean watched;
        boolean watchlist;
        BigDecimal rating;
        LocalDate lastWatched;
        String review;

        Film(String name, Integer year) {
            this.name = name;
            this.year = year;
        }
    }

    private final Map<String, Film> films = new LinkedHashMap<>();
    private String username;

    private LetterboxdExport() {
    }

    Collection<Film> films() {
        return films.values();
    }

    String username() {
        return username;
    }

    static LetterboxdExport read(String filename, byte[] bytes) {
        LetterboxdExport export = new LetterboxdExport();
        String name = filename == null ? "" : filename.toLowerCase();
        try {
            if (name.endsWith(".zip") || isZip(bytes)) {
                try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
                    for (ZipEntry entry; (entry = zip.getNextEntry()) != null; ) {
                        List<String> parts = List.of(entry.getName().replace('\\', '/').split("/"));
                        String file = parts.getLast().toLowerCase();
                        // lists/ and likes/ hold films the user hasn't necessarily watched; deleted/ is history
                        boolean skippedFolder = parts.stream().anyMatch(SKIPPED_FOLDERS::contains);
                        if (!entry.isDirectory() && !skippedFolder && file.endsWith(".csv")) {
                            export.add(file, readCapped(zip));
                        }
                    }
                }
            } else if (name.endsWith(".csv")) {
                export.add(name.substring(name.lastIndexOf('/') + 1), new String(bytes, StandardCharsets.UTF_8));
            } else {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Upload the .zip from Letterboxd (or a .csv from inside it)");
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That file couldn't be read — is it the Letterboxd export ZIP?");
        }
        if (export.films.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "No films found. Upload the ZIP from Letterboxd → Settings → Data → Export your data");
        }
        return export;
    }

    private void add(String file, String text) {
        List<Map<String, String>> rows = Csv.parse(text);
        switch (file) {
            case "watched.csv" -> rows.forEach(r -> film(r).ifWatched());
            case "ratings.csv" -> rows.forEach(r -> {
                Film f = film(r).ifWatched();
                if (f != null) {
                    f.rating = rating(r.get("Rating"));
                }
            });
            case "diary.csv", "reviews.csv" -> rows.forEach(r -> {
                Film f = film(r).ifWatched();
                if (f == null) {
                    return;
                }
                LocalDate watched = date(r.get("Watched Date"));
                if (watched != null && (f.lastWatched == null || watched.isAfter(f.lastWatched))) {
                    f.lastWatched = watched;
                    // The latest diary rating wins unless ratings.csv (the current rating) sets it
                    if (f.rating == null) {
                        f.rating = rating(r.get("Rating"));
                    }
                }
                String review = r.get("Review");
                if (review != null && !review.isBlank()) {
                    f.review = review.length() > 4000 ? review.substring(0, 4000) : review.strip();
                }
            });
            case "watchlist.csv" -> rows.forEach(r -> {
                Film f = film(r).get();
                if (f != null) {
                    f.watchlist = true;
                }
            });
            case "profile.csv" -> rows.stream().findFirst().map(r -> r.get("Username"))
                    .filter(u -> !u.isBlank()).ifPresent(u -> username = u.strip());
            default -> {
                // comments.csv, likes etc. aren't needed
            }
        }
    }

    /** Looks up (or creates) the film a row refers to; empty for rows without a name. */
    private Lookup film(Map<String, String> row) {
        String name = row.get("Name");
        if (name == null || name.isBlank()) {
            return new Lookup(null);
        }
        Integer year = year(row.get("Year"));
        return new Lookup(films.computeIfAbsent(Titles.key(name, year), k -> new Film(name.strip(), year)));
    }

    private record Lookup(Film film) {
        Film get() {
            return film;
        }

        Film ifWatched() {
            if (film != null) {
                film.watched = true;
            }
            return film;
        }
    }

    private static boolean isZip(byte[] b) {
        return b.length > 3 && b[0] == 'P' && b[1] == 'K' && b[2] == 3 && b[3] == 4;
    }

    private static String readCapped(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        for (int n; (n = in.read(buf)) > 0; ) {
            if (out.size() + n > MAX_FILE_BYTES) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A file inside that ZIP is too large to be a Letterboxd export");
            }
            out.write(buf, 0, n);
        }
        return out.toString(StandardCharsets.UTF_8);
    }

    private static Integer year(String s) {
        return s != null && s.strip().matches("\\d{4}") ? Integer.valueOf(s.strip()) : null;
    }

    /** Letterboxd ratings are already 0.5–5 in half-star steps. */
    private static BigDecimal rating(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        try {
            BigDecimal r = new BigDecimal(s.strip());
            return r.signum() > 0 && r.compareTo(BigDecimal.valueOf(5)) <= 0 ? r : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static LocalDate date(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(s.strip());
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
