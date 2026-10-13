package com.backlogd.api.catalog;

import com.backlogd.api.common.ApiException;
import com.backlogd.api.media.Media;
import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaRepository;
import com.backlogd.api.media.MediaSource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class CatalogService {

    private final AniListClient aniList;
    private final TmdbClient tmdb;
    private final MediaRepository mediaRepository;

    public CatalogService(AniListClient aniList, TmdbClient tmdb, MediaRepository mediaRepository) {
        this.aniList = aniList;
        this.tmdb = tmdb;
        this.mediaRepository = mediaRepository;
    }

    /** Which kinds can be searched online right now (games are manual until IGDB is set up). */
    public Map<MediaKind, Boolean> searchableKinds() {
        return Map.of(MediaKind.ANIME, true, MediaKind.FILM, tmdb.isConfigured(), MediaKind.GAME, false);
    }

    public List<CatalogItem> search(MediaKind kind, String query) {
        String q = query == null ? "" : query.trim();
        if (q.length() < 2) {
            return List.of();
        }
        return switch (kind) {
            case ANIME -> aniList.search(q);
            case FILM -> tmdb.search(q);
            case GAME -> throw new ApiException(HttpStatus.BAD_REQUEST, "Game search isn't available yet — add games manually");
        };
    }

    /** Finds the cached title, fetching it from its source the first time; manual titles are always new. */
    @Transactional
    public Media resolve(MediaRef ref) {
        if (ref.source() == MediaSource.MANUAL) {
            if (ref.kind() == null || ref.title() == null || ref.title().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Manual entries need a kind and a title");
            }
            return mediaRepository.save(Media.from(new CatalogItem(ref.kind(), MediaSource.MANUAL, null,
                    ref.title().trim(), ref.year(), blankToNull(ref.posterUrl()), null, null, null, List.of())));
        }
        if (ref.externalId() == null || ref.externalId().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "externalId is required for " + ref.source());
        }
        return mediaRepository.findBySourceAndExternalId(ref.source(), ref.externalId())
                .orElseGet(() -> mediaRepository.save(Media.from(fetch(ref))));
    }

    /** Caches an already-fetched catalog title (used by importers), reusing the stored copy if present. */
    @Transactional
    public Media resolve(CatalogItem item) {
        return mediaRepository.findBySourceAndExternalId(item.source(), item.externalId())
                .orElseGet(() -> mediaRepository.save(Media.from(item)));
    }

    private CatalogItem fetch(MediaRef ref) {
        return (switch (ref.source()) {
            case ANILIST -> aniList.get(ref.externalId());
            case TMDB -> tmdb.get(ref.externalId());
            case MAL, MANUAL -> throw new ApiException(HttpStatus.BAD_REQUEST, ref.source() + " titles can't be looked up");
        }).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That title no longer exists on " + ref.source()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
