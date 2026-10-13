package com.backlogd.api.connection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConnectionRepository extends JpaRepository<Connection, UUID> {

    List<Connection> findByUserId(UUID userId);

    Optional<Connection> findByUserIdAndProvider(UUID userId, Provider provider);
}
