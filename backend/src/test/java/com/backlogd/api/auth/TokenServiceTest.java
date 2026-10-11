package com.backlogd.api.auth;

import com.backlogd.api.config.SecurityConfig;
import com.backlogd.api.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class TokenServiceTest {

    private final SecurityConfig config = new SecurityConfig();
    private final SecretKey key = config.jwtSigningKey(Base64.getEncoder().encodeToString(new byte[32]));
    private final TokenService tokens = new TokenService(config.jwtEncoder(key), Duration.ofHours(1));
    private final JwtDecoder decoder = config.jwtDecoder(key);

    @Test
    void issuedTokenDecodesToUser() {
        User user = new User("rei@example.com", "rei", "Rei", "hash");

        Jwt jwt = decoder.decode(tokens.issue(user));

        assertThat(jwt.getSubject()).isEqualTo(user.getId().toString());
        assertThat(jwt.getClaimAsString("username")).isEqualTo("rei");
        assertThat(jwt.getExpiresAt()).isAfter(jwt.getIssuedAt());
    }
}
