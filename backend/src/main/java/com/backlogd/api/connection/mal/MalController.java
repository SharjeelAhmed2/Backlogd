package com.backlogd.api.connection.mal;

import com.backlogd.api.connection.mal.MalImportService.ImportResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/connections/mal")
public class MalController {

    private final MalImportService importService;

    public MalController(MalImportService importService) {
        this.importService = importService;
    }

    public record ImportRequest(@NotBlank String username) {
    }

    /** Links the MAL username (or re-syncs it) and imports titles not already in the log. */
    @PostMapping("/import")
    public ImportResult importList(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ImportRequest req) {
        return importService.importList(UUID.fromString(jwt.getSubject()), req.username());
    }
}
