package com.backlogd.api.common;

import java.text.Normalizer;
import java.util.Objects;

/** Loose title comparison used by importers to avoid duplicating titles the user already logged. */
public final class Titles {

    private Titles() {
    }

    /** "ELDEN RING™", "Elden Ring" and "elden-ring" all become "eldenring"; accents are dropped. */
    public static String normalize(String title) {
        String noMarks = Objects.requireNonNullElse(title, "").replaceAll("[™®©]", "");
        String plain = Normalizer.normalize(noMarks, Normalizer.Form.NFKD);
        return plain.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    /** Title plus release year, for telling remakes apart ("Dune 1984" vs "Dune 2021"). */
    public static String key(String title, Integer year) {
        return normalize(title) + "|" + (year == null ? "" : year);
    }
}
