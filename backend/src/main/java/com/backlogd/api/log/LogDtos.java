package com.backlogd.api.log;

import com.backlogd.api.catalog.MediaRef;
import com.backlogd.api.media.MediaResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class LogDtos {

    private LogDtos() {
    }

    /** Create and update share this shape; {@code media} is only read on create. */
    public record LogRequest(
            @Valid MediaRef media,
            @NotNull LogStatus status,
            @DecimalMin("0.5") @DecimalMax("5.0") BigDecimal rating,
            Platform platform,
            @Size(max = 40) String console,
            @Min(0) Integer progress,
            @DecimalMin("0.0") @DecimalMax("999999.9") BigDecimal hours,
            LocalDate startedOn,
            LocalDate finishedOn,
            @Size(max = 4000) String notes) {
    }

    public record LogResponse(UUID id, MediaResponse media, LogStatus status, BigDecimal rating, Platform platform,
                              String console, Integer progress, BigDecimal hours, LocalDate startedOn,
                              LocalDate finishedOn, String notes, Instant createdAt, Instant updatedAt) {

        public static LogResponse from(LogEntry e) {
            return new LogResponse(e.getId(), MediaResponse.from(e.getMedia()), e.getStatus(), e.getRating(),
                    e.getPlatform(), e.getConsole(), e.getProgress(), e.getHours(), e.getStartedOn(),
                    e.getFinishedOn(), e.getNotes(), e.getCreatedAt(), e.getUpdatedAt());
        }
    }
}
