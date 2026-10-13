package com.backlogd.api.media;

import com.backlogd.api.catalog.CatalogItem;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "media")
public class Media {

    private static final String GENRE_SEPARATOR = "|";

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MediaKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MediaSource source;

    @Column(name = "external_id")
    private String externalId;

    @Column(nullable = false)
    private String title;

    @Column(name = "release_year")
    private Integer releaseYear;

    @Column(name = "poster_url")
    private String posterUrl;

    @Column(name = "backdrop_url")
    private String backdropUrl;

    private String overview;

    private Integer episodes;

    private String genres;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Media() {
    }

    public static Media from(CatalogItem item) {
        Media m = new Media();
        m.id = UUID.randomUUID();
        m.kind = item.kind();
        m.source = item.source();
        m.externalId = item.externalId();
        m.title = truncate(item.title(), 300);
        m.releaseYear = item.year();
        m.posterUrl = truncate(item.posterUrl(), 1000);
        m.backdropUrl = truncate(item.backdropUrl(), 1000);
        m.overview = truncate(item.overview(), 4000);
        m.episodes = item.episodes();
        m.genres = item.genres() == null || item.genres().isEmpty()
                ? null : truncate(String.join(GENRE_SEPARATOR, item.genres()), 500);
        m.createdAt = Instant.now();
        return m;
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    public UUID getId() {
        return id;
    }

    public MediaKind getKind() {
        return kind;
    }

    public MediaSource getSource() {
        return source;
    }

    public String getExternalId() {
        return externalId;
    }

    public String getTitle() {
        return title;
    }

    public Integer getReleaseYear() {
        return releaseYear;
    }

    public String getPosterUrl() {
        return posterUrl;
    }

    public String getBackdropUrl() {
        return backdropUrl;
    }

    public String getOverview() {
        return overview;
    }

    public Integer getEpisodes() {
        return episodes;
    }

    public List<String> getGenres() {
        return genres == null ? List.of() : Arrays.asList(genres.split("\\" + GENRE_SEPARATOR));
    }
}
