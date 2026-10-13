package com.backlogd.api.connection;

import com.backlogd.api.connection.mal.MalClient;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    private final ConnectionRepository connections;
    private final MalClient mal;

    public ConnectionController(ConnectionRepository connections, MalClient mal) {
        this.connections = connections;
        this.mal = mal;
    }

    public record ConnectionResponse(Provider provider, String account, Instant lastSyncedAt, String lastSummary) {
    }

    /** Linked accounts, plus which providers the server has credentials for. */
    public record ConnectionsResponse(List<ConnectionResponse> connections, Map<Provider, Boolean> available) {
    }

    @GetMapping
    public ConnectionsResponse list(@AuthenticationPrincipal Jwt jwt) {
        List<ConnectionResponse> linked = connections.findByUserId(UUID.fromString(jwt.getSubject())).stream()
                .map(c -> new ConnectionResponse(c.getProvider(), c.getAccount(), c.getLastSyncedAt(), c.getLastSummary()))
                .toList();
        return new ConnectionsResponse(linked,
                Map.of(Provider.MAL, mal.isConfigured(), Provider.STEAM, false, Provider.LETTERBOXD, false));
    }

    /** Unlinks the account. Entries that were imported stay in the log. */
    @DeleteMapping("/{provider}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void disconnect(@AuthenticationPrincipal Jwt jwt, @PathVariable Provider provider) {
        connections.findByUserIdAndProvider(UUID.fromString(jwt.getSubject()), provider)
                .ifPresent(connections::delete);
    }
}
