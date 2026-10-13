package com.backlogd.api.log;

import com.backlogd.api.media.Media;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "log_entries")
public class LogEntry {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "media_id", nullable = false, updatable = false)
    private Media media;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LogStatus status;

    @Column(precision = 2, scale = 1)
    private BigDecimal rating;

    @Enumerated(EnumType.STRING)
    private Platform platform;

    private String console;

    private Integer progress;

    @Column(precision = 7, scale = 1)
    private BigDecimal hours;

    @Column(name = "started_on")
    private LocalDate startedOn;

    @Column(name = "finished_on")
    private LocalDate finishedOn;

    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected LogEntry() {
    }

    public LogEntry(UUID userId, Media media) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.media = media;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void apply(LogStatus status, BigDecimal rating, Platform platform, String console, Integer progress,
               BigDecimal hours, LocalDate startedOn, LocalDate finishedOn, String notes) {
        this.status = status;
        this.rating = rating;
        this.platform = platform;
        this.console = console;
        this.progress = progress;
        this.hours = hours;
        this.startedOn = startedOn;
        this.finishedOn = finishedOn;
        this.notes = notes;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public Media getMedia() {
        return media;
    }

    public LogStatus getStatus() {
        return status;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getConsole() {
        return console;
    }

    public Integer getProgress() {
        return progress;
    }

    public BigDecimal getHours() {
        return hours;
    }

    public LocalDate getStartedOn() {
        return startedOn;
    }

    public LocalDate getFinishedOn() {
        return finishedOn;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
