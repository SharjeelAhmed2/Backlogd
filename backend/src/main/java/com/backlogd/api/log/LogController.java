package com.backlogd.api.log;

import com.backlogd.api.log.LogDtos.LogRequest;
import com.backlogd.api.log.LogDtos.LogResponse;
import com.backlogd.api.media.MediaKind;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }

    @GetMapping
    public List<LogResponse> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) MediaKind kind) {
        return logService.list(userId(jwt), kind);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LogResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody LogRequest req) {
        return logService.create(userId(jwt), req);
    }

    @PutMapping("/{id}")
    public LogResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                              @Valid @RequestBody LogRequest req) {
        return logService.update(userId(jwt), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        logService.delete(userId(jwt), id);
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
