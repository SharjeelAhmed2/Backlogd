package com.backlogd.api.media;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MediaRepository extends JpaRepository<Media, UUID> {

    Optional<Media> findBySourceAndExternalId(MediaSource source, String externalId);
}
