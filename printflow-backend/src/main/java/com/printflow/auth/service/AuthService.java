package com.printflow.auth.service;

import com.google.firebase.auth.FirebaseToken;
import com.printflow.auth.dto.AuthResponse;
import com.printflow.auth.dto.FirebaseTokenRequest;
import com.printflow.auth.dto.RefreshTokenRequest;
import com.printflow.auth.entity.RefreshToken;
import com.printflow.auth.repository.RefreshTokenRepository;
import com.printflow.common.exception.ErrorResponse;
import com.printflow.shops.service.ShopService;
import com.printflow.users.entity.User;
import com.printflow.users.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final FirebaseTokenVerifier firebaseVerifier;
    private final JwtService jwtService;
    private final UserService userService;
    private final ShopService shopService;
    private final RefreshTokenRepository refreshTokenRepository;

    public AuthService(FirebaseTokenVerifier firebaseVerifier,
                       JwtService jwtService,
                       UserService userService,
                       ShopService shopService,
                       RefreshTokenRepository refreshTokenRepository) {
        this.firebaseVerifier = firebaseVerifier;
        this.jwtService = jwtService;
        this.userService = userService;
        this.shopService = shopService;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public ResponseEntity<?> verifyAndIssueTokens(FirebaseTokenRequest request) {
        FirebaseToken firebaseToken = firebaseVerifier.verify(request.firebaseToken());
        User user = userService.findOrCreate(firebaseToken, request.role());
        UUID shopId = shopService.getShopIdByOwnerId(user.getId());
        String accessToken = jwtService.generateAccessToken(user, shopId);

        // Generate a fresh refresh token and persist only its hash
        String rawRefreshToken = jwtService.generateRefreshToken();
        persistRefreshToken(user.getId(), rawRefreshToken);

        AuthResponse.AuthData data = new AuthResponse.AuthData(
            accessToken,
            rawRefreshToken,
            3600,
            new AuthResponse.UserInfo(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getAvatarUrl()
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", data
        ));
    }

    @Transactional
    public ResponseEntity<?> refreshToken(RefreshTokenRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isBlank()) {
            return unauthorized("MISSING_TOKEN", "Refresh token is required");
        }

        String hash = jwtService.hashToken(request.refreshToken());
        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByTokenHash(hash);

        if (tokenOpt.isEmpty()) {
            return unauthorized("INVALID_TOKEN", "Refresh token not found");
        }

        RefreshToken storedToken = tokenOpt.get();

        if (storedToken.getUsed()) {
            // Possible token reuse attack — invalidate all tokens for this user
            refreshTokenRepository.deleteAllByUserId(storedToken.getUserId());
            return unauthorized("TOKEN_REUSE", "Refresh token already used — all sessions invalidated");
        }

        if (storedToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            refreshTokenRepository.delete(storedToken);
            return unauthorized("TOKEN_EXPIRED", "Refresh token has expired. Please log in again.");
        }

        // Mark old token as used (rotation — single use)
        storedToken.setUsed(true);
        refreshTokenRepository.save(storedToken);

        // Issue a fresh token pair
        User user = userService.findById(storedToken.getUserId())
            .orElseThrow(() -> new IllegalStateException("User not found for refresh token"));
        UUID shopId = shopService.getShopIdByOwnerId(user.getId());
        String newAccessToken = jwtService.generateAccessToken(user, shopId);
        String newRawRefreshToken = jwtService.generateRefreshToken();
        persistRefreshToken(user.getId(), newRawRefreshToken);

        AuthResponse.AuthData data = new AuthResponse.AuthData(
            newAccessToken,
            newRawRefreshToken,
            3600,
            new AuthResponse.UserInfo(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getAvatarUrl()
            )
        );

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void persistRefreshToken(UUID userId, String rawToken) {
        OffsetDateTime expiresAt = OffsetDateTime.now()
            .plusSeconds(jwtService.getRefreshExpirySeconds());
        RefreshToken entity = RefreshToken.builder()
            .userId(userId)
            .tokenHash(jwtService.hashToken(rawToken))
            .expiresAt(expiresAt)
            .build();
        refreshTokenRepository.save(entity);
    }

    private ResponseEntity<?> unauthorized(String code, String message) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("success", false,
                "error", new ErrorResponse(code, message)));
    }
}
