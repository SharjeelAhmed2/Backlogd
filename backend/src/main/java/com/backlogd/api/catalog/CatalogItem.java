package com.backlogd.api.catalog;

import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaSource;

import java.util.List;

/** A title as returned by an external catalog (AniList, TMDB) or entered by hand. */
public record CatalogItem(MediaKind kind, MediaSource source, String externalId, String title, Integer year,
                          String posterUrl, String backdropUrl, String overview, Integer episodes,
                          List<String> genres) {
}
