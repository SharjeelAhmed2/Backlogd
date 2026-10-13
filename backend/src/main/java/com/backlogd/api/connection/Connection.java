package com.backlogd.api.connection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** An external account linked to a user, e.g. their MyAnimeList username. */
@Entity
@Table(name = "connections")
public class Connection {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Provider provider;

    @Column(nullable = false)
    private String account;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "last_summary")
    private String lastSummary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Connection() {
    }

    public Connection(UUID userId, Provider provider, String account) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.provider = provider;
        this.account = account;
        this.createdAt = Instant.now();
    }

    public void recordSync(String account, String displayName, String summary) {
        this.account = account;
        this.displayName = displayName;
        this.lastSyncedAt = Instant.now();
        this.lastSummary = summary.length() > 300 ? summary.substring(0, 300) : summary;
    }

    public Provider getProvider() {
        return provider;
    }

    public String getAccount() {
        return account;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Instant getLastSyncedAt() {
        return lastSyncedAt;
    }

    public String getLastSummary() {
        return lastSummary;
    }
}
