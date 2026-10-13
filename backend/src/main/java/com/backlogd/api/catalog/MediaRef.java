package com.backlogd.api.catalog;

import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaSource;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Points at a title: either an external one ({@code source} + {@code externalId}, details fetched
 * server-side) or a manual one ({@code source=MANUAL} + {@code kind} + {@code title}).
 */
public record MediaRef(
        @NotNull MediaSource source,
        @Size(max = 64) String externalId,
        MediaKind kind,
        @Size(max = 300) String title,
        @Min(1900) @Max(2100) Integer year,
        @Size(max = 1000) @Pattern(regexp = "^(https?://.*)?$", message = "must be an http(s) link") String posterUrl) {
}
