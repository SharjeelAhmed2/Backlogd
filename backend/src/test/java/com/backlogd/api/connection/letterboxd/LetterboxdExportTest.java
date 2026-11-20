package com.backlogd.api.connection.letterboxd;

import com.backlogd.api.common.ApiException;
import com.backlogd.api.connection.letterboxd.LetterboxdExport.Film;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LetterboxdExportTest {

    private static byte[] zip(Map<String, String> files) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (Map.Entry<String, String> f : files.entrySet()) {
                zip.putNextEntry(new ZipEntry(f.getKey()));
                zip.write(f.getValue().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }

    private static Map<String, Film> byKey(LetterboxdExport export) {
        return export.films().stream().collect(Collectors.toMap(f -> f.name + " " + f.year, Function.identity()));
    }

    @Test
    void mergesExportFilesPerFilm() throws IOException {
        byte[] bytes = zip(Map.of(
                "profile.csv", "Date Joined,Username,Given Name\n2020-01-01,cinephile,Sam\n",
                "watched.csv", "Date,Name,Year,Letterboxd URI\n"
                        + "2024-03-01,Dune,2021,https://boxd.it/a\n"
                        + "2024-03-02,Dune,1984,https://boxd.it/b\n"
                        + "2024-03-03,\"Crouching Tiger, Hidden Dragon\",2000,https://boxd.it/c\n",
                "ratings.csv", "Date,Name,Year,Letterboxd URI,Rating\n2024-03-01,Dune,2021,https://boxd.it/a,4.5\n",
                "diary.csv", "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n"
                        + "2024-03-01,Dune,2021,https://boxd.it/x,4,,,2024-02-28\n"
                        + "2024-06-01,Dune,2021,https://boxd.it/y,4,Yes,,2024-05-30\n",
                "reviews.csv", "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date\n"
                        + "2024-03-03,\"Crouching Tiger, Hidden Dragon\",2000,https://boxd.it/r,5,,\"Line one,\nline \"\"two\"\"\",,2024-03-03\n",
                "watchlist.csv", "Date,Name,Year,Letterboxd URI\n2024-01-01,Arrival,2016,https://boxd.it/w\n",
                "lists/favourites.csv", "Date,Name,Year,Letterboxd URI\n2024-01-01,Not Watched,1999,https://boxd.it/l\n"));

        LetterboxdExport export = LetterboxdExport.read("letterboxd-cinephile.zip", bytes);
        Map<String, Film> films = byKey(export);

        assertThat(export.username()).isEqualTo("cinephile");
        assertThat(films).containsOnlyKeys("Dune 2021", "Dune 1984", "Crouching Tiger, Hidden Dragon 2000", "Arrival 2016");

        Film dune = films.get("Dune 2021");
        assertThat(dune.watched).isTrue();
        assertThat(dune.rating).isEqualByComparingTo(new BigDecimal("4.5")); // ratings.csv beats the diary
        assertThat(dune.lastWatched).isEqualTo(LocalDate.of(2024, 5, 30));

        Film tiger = films.get("Crouching Tiger, Hidden Dragon 2000");
        assertThat(tiger.review).isEqualTo("Line one,\nline \"two\"");
        assertThat(tiger.rating).isEqualByComparingTo("5");

        Film arrival = films.get("Arrival 2016");
        assertThat(arrival.watched).isFalse();
        assertThat(arrival.watchlist).isTrue();
    }

    @Test
    void acceptsARezippedFolderAndASingleCsv() throws IOException {
        byte[] nested = zip(Map.of("letterboxd-me-2026/watched.csv", "Date,Name,Year,Letterboxd URI\n2024-01-01,Heat,1995,u\n"));
        assertThat(byKey(LetterboxdExport.read("export.zip", nested))).containsOnlyKeys("Heat 1995");

        byte[] csv = "﻿Date,Name,Year,Letterboxd URI\r\n2024-01-01,Heat,1995,u\r\n".getBytes(StandardCharsets.UTF_8);
        assertThat(byKey(LetterboxdExport.read("watched.csv", csv))).containsOnlyKeys("Heat 1995");
    }

    @Test
    void rejectsFilesWithoutFilms() {
        assertThatThrownBy(() -> LetterboxdExport.read("notes.txt", "hello".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> LetterboxdExport.read("comments.csv", "Date,Comment\n2024-01-01,hi\n".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No films found");
    }
}
