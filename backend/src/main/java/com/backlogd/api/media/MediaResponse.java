package com.backlogd.api.media;

import java.util.List;
import java.util.UUID;

public record MediaResponse(UUID id, MediaKind kind, MediaSource source, String externalId, String title,
                            Integer year, String posterUrl, String backdropUrl, String overview,
                            Integer episodes, List<String> genres) {

    public static MediaResponse from(Media m) {
        return new MediaResponse(m.getId(), m.getKind(), m.getSource(), m.getExternalId(), m.getTitle(),
                m.getReleaseYear(), m.getPosterUrl(), m.getBackdropUrl(), m.getOverview(),
                m.getEpisodes(), m.getGenres());
    }
}
