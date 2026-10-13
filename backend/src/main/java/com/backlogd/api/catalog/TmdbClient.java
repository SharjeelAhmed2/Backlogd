package com.backlogd.api.catalog;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.backlogd.api.common.ApiException;
import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaSource;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * Film lookups via TMDB. Accepts either a v3 "API Key" or a v4 "API Read Access Token"
 * in TMDB_API_KEY (backend/.env).
 */
@Component
public class TmdbClient {

    private static final Logger log = LoggerFactory.getLogger(TmdbClient.class);

    private static final String IMAGES = "https://image.tmdb.org/t/p/";

    private final String apiKey;
    private final boolean bearer;
    private final RestClient http;

    public TmdbClient(@Value("${app.tmdb.api-key:}") String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.bearer = this.apiKey.startsWith("eyJ");
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.themoviedb.org/3");
        if (bearer) {
            builder.defaultHeader("Authorization", "Bearer " + this.apiKey);
        }
        this.http = builder.build();
    }

    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    public List<CatalogItem> search(String query) {
        SearchResponse res = get(b -> b.path("/search/movie")
                .queryParam("query", query)
                .queryParam("include_adult", false), SearchResponse.class);
        return res == null || res.results() == null ? List.of()
                : res.results().stream().map(TmdbClient::toItem).toList();
    }

    public Optional<CatalogItem> get(String id) {
        if (!id.matches("\\d{1,12}")) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(get(b -> b.path("/movie/" + id), Movie.class)).map(TmdbClient::toItem);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private <T> T get(Function<UriBuilder, UriBuilder> uri, Class<T> type) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Film search needs a TMDB key — add TMDB_API_KEY to backend/.env and restart");
        }
        Function<UriBuilder, URI> withAuth = b -> {
            UriBuilder built = uri.apply(b);
            return (bearer ? built : built.queryParam("api_key", apiKey)).build();
        };
        try {
            return http.get().uri(withAuth).retrieve().body(type);
        } catch (HttpClientErrorException.NotFound e) {
            throw e;
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "TMDB rejected the API key — check TMDB_API_KEY in backend/.env");
        } catch (RestClientException e) {
            // Only the root cause: the exception message itself can contain the request URL (and API key)
            log.warn("TMDB request failed: {}", e.getMostSpecificCause().toString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "TMDB is not responding, try again in a moment");
        }
    }

    private static CatalogItem toItem(Movie m) {
        Integer year = m.releaseDate() != null && m.releaseDate().length() >= 4
                ? Integer.valueOf(m.releaseDate().substring(0, 4)) : null;
        List<String> genres = m.genres() == null ? List.of() : m.genres().stream().map(Genre::name).toList();
        return new CatalogItem(MediaKind.FILM, MediaSource.TMDB, String.valueOf(m.id()), m.title(), year,
                image("w500", m.posterPath()), image("w1280", m.backdropPath()),
                m.overview() == null || m.overview().isBlank() ? null : m.overview(), null, genres);
    }

    private static String image(String size, String path) {
        return path == null ? null : IMAGES + size + path;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SearchResponse(List<Movie> results) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Movie(long id, String title, @JsonProperty("release_date") String releaseDate,
                 @JsonProperty("poster_path") String posterPath, @JsonProperty("backdrop_path") String backdropPath,
                 String overview, List<Genre> genres) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Genre(String name) {
    }
}
