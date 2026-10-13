package com.backlogd.api.connection.steam;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.backlogd.api.common.ApiException;
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
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Steam Web API: resolve a profile and read its owned games with playtime. Key from STEAM_API_KEY. */
@Component
public class SteamClient {

    private static final Logger log = LoggerFactory.getLogger(SteamClient.class);

    private static final Pattern PROFILE_URL = Pattern.compile("steamcommunity\\.com/profiles/(\\d{17})", Pattern.CASE_INSENSITIVE);
    private static final Pattern VANITY_URL = Pattern.compile("steamcommunity\\.com/id/([A-Za-z0-9_-]{2,32})", Pattern.CASE_INSENSITIVE);
    private static final Pattern STEAM_ID = Pattern.compile("^\\d{17}$");
    private static final Pattern VANITY_NAME = Pattern.compile("^[A-Za-z0-9_-]{2,32}$");

    private final String apiKey;
    private final RestClient http = RestClient.builder().baseUrl("https://api.steampowered.com").build();

    public SteamClient(@Value("${app.steam.api-key:}") String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    /** Accepts a profile link, a 17-digit SteamID or a custom URL name and returns the SteamID. */
    public String resolveSteamId(String input) {
        String s = input == null ? "" : input.trim();
        Matcher m = PROFILE_URL.matcher(s);
        if (m.find()) {
            return m.group(1);
        }
        if (STEAM_ID.matcher(s).matches()) {
            return s;
        }
        m = VANITY_URL.matcher(s);
        String vanity = m.find() ? m.group(1) : VANITY_NAME.matcher(s).matches() ? s : null;
        if (vanity == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter your Steam profile link, SteamID or custom URL name");
        }
        VanityResponse res = get(b -> b.path("/ISteamUser/ResolveVanityURL/v1/").queryParam("vanityurl", vanity),
                VanityResponse.class);
        if (res == null || res.response() == null || res.response().success() != 1 || res.response().steamid() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No Steam profile with the custom URL \"" + vanity + "\"");
        }
        return res.response().steamid();
    }

    /** The profile's display (persona) name. */
    public String personaName(String steamId) {
        SummariesResponse res = get(b -> b.path("/ISteamUser/GetPlayerSummaries/v2/").queryParam("steamids", steamId),
                SummariesResponse.class);
        if (res == null || res.response() == null || res.response().players() == null || res.response().players().isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Steam has no profile with that id");
        }
        return res.response().players().getFirst().personaname();
    }

    public List<OwnedGame> ownedGames(String steamId) {
        OwnedResponse res = get(b -> b.path("/IPlayerService/GetOwnedGames/v1/")
                .queryParam("steamid", steamId)
                .queryParam("include_appinfo", 1)
                .queryParam("include_played_free_games", 1), OwnedResponse.class);
        // Private "Game details" comes back as an empty response rather than an error
        if (res == null || res.response() == null || res.response().games() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Your Steam game details are private — set Game details to Public in your Steam privacy settings, then sync again");
        }
        return res.response().games();
    }

    private <T> T get(Function<UriBuilder, UriBuilder> uri, Class<T> type) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Steam import needs STEAM_API_KEY in backend/.env — add it and restart the backend");
        }
        Function<UriBuilder, URI> withKey = b -> uri.apply(b).queryParam("key", apiKey).build();
        try {
            return http.get().uri(withKey).retrieve().body(type);
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Steam rejected the API key — check STEAM_API_KEY in backend/.env");
        } catch (HttpClientErrorException.TooManyRequests e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Steam is rate limiting requests, try again in a minute");
        } catch (RestClientException e) {
            // Only the root cause: the exception message itself can contain the request URL (and API key)
            log.warn("Steam request failed: {}", e.getMostSpecificCause().toString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Steam is not responding, try again in a moment");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record VanityResponse(Vanity response) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Vanity(String steamid, int success) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SummariesResponse(Summaries response) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Summaries(List<Player> players) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Player(String personaname) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record OwnedResponse(Owned response) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Owned(List<OwnedGame> games) {
    }

    /** Playtimes are in minutes; {@code playtime2Weeks} is absent when the game wasn't played recently. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OwnedGame(long appid, String name,
                            @JsonProperty("playtime_forever") Integer playtimeForever,
                            @JsonProperty("playtime_2weeks") Integer playtime2Weeks) {
    }
}
