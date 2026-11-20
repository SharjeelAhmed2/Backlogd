package com.backlogd.api.connection.letterboxd;

import com.backlogd.api.common.ApiException;
import com.backlogd.api.connection.letterboxd.LetterboxdImportService.ImportResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/connections/letterboxd")
public class LetterboxdController {

    private final LetterboxdImportService importService;

    public LetterboxdController(LetterboxdImportService importService) {
        this.importService = importService;
    }

    /** Multipart upload of the Letterboxd export ZIP (or one CSV from it) in a field named {@code file}. */
    @PostMapping(path = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResult importExport(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file)
            throws IOException {
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The uploaded file is empty");
        }
        return importService.importExport(UUID.fromString(jwt.getSubject()), file.getOriginalFilename(), file.getBytes());
    }
}
