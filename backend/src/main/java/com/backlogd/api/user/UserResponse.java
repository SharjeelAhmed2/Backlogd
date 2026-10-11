package com.backlogd.api.user;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String email, String username, String displayName, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getUsername(),
                user.getDisplayName(), user.getCreatedAt());
    }
}
