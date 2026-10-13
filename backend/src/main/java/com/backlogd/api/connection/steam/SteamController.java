package com.backlogd.api.connection.steam;

import com.backlogd.api.connection.steam.SteamImportService.ImportResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/connections/steam")
public class SteamController {

    private final SteamImportService importService;

    public SteamController(SteamImportService importService) {
        this.importService = importService;
    }

    /** {@code profile} may be a profile link, a 17-digit SteamID or a custom URL name. */
    public record ImportRequest(@NotBlank @Size(max = 200) String profile) {
    }

    @PostMapping("/import")
    public ImportResult importLibrary(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ImportRequest req) {
        return importService.importLibrary(UUID.fromString(jwt.getSubject()), req.profile());
    }
}
