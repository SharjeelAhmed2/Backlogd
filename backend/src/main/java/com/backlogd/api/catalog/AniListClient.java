package com.backlogd.api.catalog;

import com.backlogd.api.common.ApiException;
import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaSource;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Anime lookups via the public AniList GraphQL API (no key needed). */
@Component
public class AniListClient {

    private static final String FIELDS = """
            fragment f on Media {
              id
              idMal
              title { english romaji }
              seasonYear
              startDate { year }
              episodes
              coverImage { extraLarge large }
              bannerImage
              description(asHtml: false)
              genres
            }
            """;

    private static final String SEARCH = """
            query ($q: String) {
              Page(perPage: 18) {
                media(search: $q, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ...f }
              }
            }
            """ + FIELDS;

    private static final String BY_ID = """
            query ($id: Int) {
              Media(id: $id, type: ANIME, isAdult: false) { ...f }
            }
            """ + FIELDS;

    private static final String BY_MAL_IDS = """
            query ($ids: [Int]) {
              Page(perPage: 50) {
                media(idMal_in: $ids, type: ANIME) { ...f }
              }
            }
            """ + FIELDS;

    private final RestClient http = RestClient.builder().baseUrl("https://graphql.anilist.co").build();

    /** Maps MyAnimeList ids to AniList titles, 50 per request. Ids AniList doesn't know are left out. */
    public Map<Integer, CatalogItem> findByMalIds(List<Integer> malIds) {
        Map<Integer, CatalogItem> found = new HashMap<>();
        for (int i = 0; i < malIds.size(); i += 50) {
            List<Integer> batch = malIds.subList(i, Math.min(i + 50, malIds.size()));
            Data data = postWithRetry(BY_MAL_IDS, Map.of("ids", batch));
            if (data != null && data.page() != null && data.page().media() != null) {
                for (AniMedia m : data.page().media()) {
                    if (m.idMal() != null) {
                        found.put(m.idMal(), toItem(m));
                    }
                }
            }
        }
        return found;
    }

    /** AniList allows ~30 requests/minute; on 429 wait as told and try once more. */
    private Data postWithRetry(String query, Map<String, Object> variables) {
        try {
            return post(query, variables);
        } catch (RateLimited e) {
            try {
                Thread.sleep(Math.min(e.retryAfterSeconds, 65) * 1000L);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Import interrupted");
            }
            return post(query, variables);
        }
    }

    public List<CatalogItem> search(String query) {
        Data data = post(SEARCH, Map.of("q", query));
        if (data == null || data.page() == null || data.page().media() == null) {
            return List.of();
        }
        return data.page().media().stream().map(AniListClient::toItem).toList();
    }

    public Optional<CatalogItem> get(String id) {
        int anilistId;
        try {
            anilistId = Integer.parseInt(id);
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
        try {
            Data data = post(BY_ID, Map.of("id", anilistId));
            return Optional.ofNullable(data).map(Data::media).map(AniListClient::toItem);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private Data post(String query, Map<String, Object> variables) {
        try {
            Response res = http.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(Map.of("query", query, "variables", variables))
                    .retrieve()
                    .body(Response.class);
            return res == null ? null : res.data();
        } catch (HttpClientErrorException.NotFound e) {
            throw e;
        } catch (HttpClientErrorException.TooManyRequests e) {
            String retryAfter = e.getResponseHeaders() == null ? null : e.getResponseHeaders().getFirst("Retry-After");
            throw new RateLimited(retryAfter == null || !retryAfter.matches("\\d+") ? 60 : Integer.parseInt(retryAfter));
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AniList is not responding, try again in a moment");
        }
    }

    private static final class RateLimited extends ApiException {
        final int retryAfterSeconds;

        RateLimited(int retryAfterSeconds) {
            super(HttpStatus.TOO_MANY_REQUESTS, "AniList is busy, try again in a minute");
            this.retryAfterSeconds = retryAfterSeconds;
        }
    }

    private static CatalogItem toItem(AniMedia m) {
        String title = m.title() == null ? "Untitled"
                : m.title().english() != null ? m.title().english() : m.title().romaji();
        Integer year = m.seasonYear() != null ? m.seasonYear() : m.startDate() == null ? null : m.startDate().year();
        String poster = m.coverImage() == null ? null
                : m.coverImage().extraLarge() != null ? m.coverImage().extraLarge() : m.coverImage().large();
        return new CatalogItem(MediaKind.ANIME, MediaSource.ANILIST, String.valueOf(m.id()), title, year,
                poster, m.bannerImage(), stripHtml(m.description()), m.episodes(), m.genres());
    }

    private static String stripHtml(String s) {
        return s == null ? null : s.replaceAll("<[^>]+>", "").replace("&quot;", "\"").replace("&amp;", "&").trim();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Response(Data data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Data(@JsonProperty("Page") Page page, @JsonProperty("Media") AniMedia media) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Page(List<AniMedia> media) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record AniMedia(long id, Integer idMal, Title title, Integer seasonYear, StartDate startDate, Integer episodes,
                    Cover coverImage, String bannerImage, String description, List<String> genres) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Title(String english, String romaji) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record StartDate(Integer year) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Cover(String extraLarge, String large) {
    }
}
