package com.backlogd.api.connection.letterboxd;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, and commas/newlines inside quotes. */
final class Csv {

    private Csv() {
    }

    /** Rows keyed by header name. A leading BOM is ignored; blank lines are skipped. */
    static List<Map<String, String>> parse(String text) {
        List<List<String>> rows = rows(text.startsWith("﻿") ? text.substring(1) : text);
        if (rows.isEmpty()) {
            return List.of();
        }
        List<String> header = rows.getFirst().stream().map(String::trim).toList();
        List<Map<String, String>> out = new ArrayList<>();
        for (List<String> row : rows.subList(1, rows.size())) {
            if (row.size() == 1 && row.getFirst().isBlank()) {
                continue;
            }
            Map<String, String> record = new HashMap<>();
            for (int i = 0; i < header.size() && i < row.size(); i++) {
                record.put(header.get(i), row.get(i));
            }
            out.add(record);
        }
        return out;
    }

    private static List<List<String>> rows(String text) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                quoted = true;
            } else if (c == ',') {
                row.add(field.toString());
                field.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') {
                    i++;
                }
                row.add(field.toString());
                field.setLength(0);
                rows.add(row);
                row = new ArrayList<>();
            } else {
                field.append(c);
            }
        }
        if (!field.isEmpty() || !row.isEmpty()) {
            row.add(field.toString());
            rows.add(row);
        }
        return rows;
    }
}
