package com.backlogd.api.connection.mal;

import com.backlogd.api.common.ApiException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Reads a user's public anime list from the MyAnimeList v2 API using the app's Client ID. */
@Component
public class MalClient {

    private static final String FIELDS = "list_status{status,score,num_episodes_watched,start_date,finish_date},num_episodes,start_season,main_picture";
    private static final int PAGE_SIZE = 1000;
    private static final int MAX_PAGES = 20;

    private final String clientId;
    private final RestClient http;

    public MalClient(@Value("${app.mal.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.http = RestClient.builder()
                .baseUrl("https://api.myanimelist.net/v2")
                .defaultHeader("X-MAL-CLIENT-ID", this.clientId)
                .build();
    }

    public boolean isConfigured() {
        return !clientId.isEmpty();
    }

    public List<MalEntry> animeList(String username) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "MyAnimeList import needs MAL_CLIENT_ID in backend/.env — add it and restart the backend");
        }
        List<MalEntry> all = new ArrayList<>();
        try {
            for (int pageNo = 0; pageNo < MAX_PAGES; pageNo++) {
                // fields contains { } so it must be passed as a URI variable, not a literal
                Map<String, Object> vars = Map.of("user", username, "fields", FIELDS, "offset", pageNo * PAGE_SIZE);
                Page page = http.get()
                        .uri(b -> b.path("/users/{user}/animelist")
                                .queryParam("fields", "{fields}")
                                .queryParam("limit", PAGE_SIZE)
                                .queryParam("offset", "{offset}")
                                .queryParam("nsfw", false)
                                .build(vars))
                        .retrieve()
                        .body(Page.class);
                if (page == null || page.data() == null) {
                    break;
                }
                all.addAll(page.data());
                if (page.paging() == null || page.paging().next() == null) {
                    break;
                }
            }
        } catch (HttpClientErrorException.NotFound e) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No MyAnimeList user called \"" + username + "\"");
        } catch (HttpClientErrorException.Forbidden e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "That anime list is private — set it to public on MyAnimeList, import, then you can make it private again");
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.BadRequest e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MyAnimeList rejected the Client ID — check MAL_CLIENT_ID in backend/.env");
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MyAnimeList is not responding, try again in a moment");
        }
        return all;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Page(List<MalEntry> data, Paging paging) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Paging(String next) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MalEntry(Node node, @JsonProperty("list_status") ListStatus listStatus) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Node(int id, String title, @JsonProperty("main_picture") Picture mainPicture,
                       @JsonProperty("num_episodes") Integer numEpisodes,
                       @JsonProperty("start_season") Season startSeason) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Picture(String medium, String large) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Season(Integer year) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ListStatus(String status, Integer score,
                             @JsonProperty("num_episodes_watched") Integer episodesWatched,
                             @JsonProperty("start_date") String startDate,
                             @JsonProperty("finish_date") String finishDate) {
    }
}
