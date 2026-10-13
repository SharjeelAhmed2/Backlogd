package com.backlogd.api.log;

import com.backlogd.api.media.MediaKind;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LogEntryRepository extends JpaRepository<LogEntry, UUID> {

    @EntityGraph(attributePaths = "media")
    List<LogEntry> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = "media")
    List<LogEntry> findByUserIdAndMedia_KindOrderByUpdatedAtDesc(UUID userId, MediaKind kind);

    @EntityGraph(attributePaths = "media")
    Optional<LogEntry> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndMedia_Id(UUID userId, UUID mediaId);

    @Query("select e.media.id from LogEntry e where e.userId = :userId")
    List<UUID> findMediaIdsByUserId(@Param("userId") UUID userId);
}
