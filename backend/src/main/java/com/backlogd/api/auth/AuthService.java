package com.backlogd.api.auth;

import com.backlogd.api.auth.AuthDtos.AuthResponse;
import com.backlogd.api.auth.AuthDtos.LoginRequest;
import com.backlogd.api.auth.AuthDtos.RegisterRequest;
import com.backlogd.api.common.ApiException;
import com.backlogd.api.user.User;
import com.backlogd.api.user.UserRepository;
import com.backlogd.api.user.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokens) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim();
        String username = req.username().trim();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username is taken");
        }
        String displayName = req.displayName() == null || req.displayName().isBlank()
                ? username : req.displayName().trim();

        User user = users.save(new User(email, username, displayName, passwordEncoder.encode(req.password())));
        return new AuthResponse(tokens.issue(user), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = users.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return new AuthResponse(tokens.issue(user), UserResponse.from(user));
    }
}
