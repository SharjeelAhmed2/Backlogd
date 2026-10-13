package com.backlogd.api.log;

import com.backlogd.api.catalog.CatalogService;
import com.backlogd.api.common.ApiException;
import com.backlogd.api.log.LogDtos.LogRequest;
import com.backlogd.api.log.LogDtos.LogResponse;
import com.backlogd.api.media.Media;
import com.backlogd.api.media.MediaKind;
import com.backlogd.api.media.MediaRepository;
import com.backlogd.api.media.MediaSource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class LogService {

    private static final BigDecimal TWO = BigDecimal.valueOf(2);

    private final LogEntryRepository logs;
    private final MediaRepository mediaRepository;
    private final CatalogService catalog;

    public LogService(LogEntryRepository logs, MediaRepository mediaRepository, CatalogService catalog) {
        this.logs = logs;
        this.mediaRepository = mediaRepository;
        this.catalog = catalog;
    }

    @Transactional(readOnly = true)
    public List<LogResponse> list(UUID userId, MediaKind kind) {
        List<LogEntry> entries = kind == null
                ? logs.findByUserIdOrderByUpdatedAtDesc(userId)
                : logs.findByUserIdAndMedia_KindOrderByUpdatedAtDesc(userId, kind);
        return entries.stream().map(LogResponse::from).toList();
    }

    @Transactional
    public LogResponse create(UUID userId, LogRequest req) {
        if (req.media() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "media is required");
        }
        Media media = catalog.resolve(req.media());
        if (logs.existsByUserIdAndMedia_Id(userId, media.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "\"" + media.getTitle() + "\" is already in your log");
        }
        LogEntry entry = new LogEntry(userId, media);
        apply(entry, req);
        return LogResponse.from(logs.save(entry));
    }

    @Transactional
    public LogResponse update(UUID userId, UUID id, LogRequest req) {
        LogEntry entry = find(userId, id);
        apply(entry, req);
        return LogResponse.from(entry);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        LogEntry entry = find(userId, id);
        logs.delete(entry);
        // Manual titles belong to a single entry; catalog titles stay cached for other users
        if (entry.getMedia().getSource() == MediaSource.MANUAL) {
            logs.flush();
            mediaRepository.delete(entry.getMedia());
        }
    }

    private LogEntry find(UUID userId, UUID id) {
        return logs.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Log entry not found"));
    }

    private void apply(LogEntry entry, LogRequest req) {
        Media media = entry.getMedia();
        boolean game = media.getKind() == MediaKind.GAME;

        if (req.rating() != null && req.rating().multiply(TWO).stripTrailingZeros().scale() > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rating must be in half-star steps");
        }
        if (game && req.platform() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Pick the platform you played it on");
        }
        if (req.startedOn() != null && req.finishedOn() != null && req.finishedOn().isBefore(req.startedOn())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Finish date can't be before the start date");
        }

        Integer progress = game ? null : req.progress();
        if (progress != null && media.getEpisodes() != null && progress > media.getEpisodes()) {
            progress = media.getEpisodes();
        }
        LocalDate finishedOn = req.finishedOn();
        if (req.status() == LogStatus.COMPLETED) {
            if (finishedOn == null) {
                finishedOn = LocalDate.now();
            }
            if (media.getKind() == MediaKind.ANIME && media.getEpisodes() != null) {
                progress = media.getEpisodes();
            }
        }

        entry.apply(req.status(), req.rating(),
                game ? req.platform() : null,
                game ? blankToNull(req.console()) : null,
                progress,
                game ? req.hours() : null,
                req.startedOn(), finishedOn, blankToNull(req.notes()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
