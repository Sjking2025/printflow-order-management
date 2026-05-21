package com.printflow.auth.service;

import com.google.firebase.auth.FirebaseToken;
import com.printflow.auth.dto.AuthResponse;
import com.printflow.auth.dto.FirebaseTokenRequest;
import com.printflow.auth.dto.RefreshTokenRequest;
import com.printflow.common.exception.ErrorResponse;
import com.printflow.shops.entity.Shop;
import com.printflow.shops.service.ShopService;
import com.printflow.users.entity.User;
import com.printflow.users.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final FirebaseTokenVerifier firebaseVerifier;
    private final JwtService jwtService;
    private final UserService userService;
    private final ShopService shopService;

    public AuthService(FirebaseTokenVerifier firebaseVerifier, JwtService jwtService,
                       UserService userService, ShopService shopService) {
        this.firebaseVerifier = firebaseVerifier;
        this.jwtService = jwtService;
        this.userService = userService;
        this.shopService = shopService;
    }

    public ResponseEntity<?> verifyAndIssueTokens(FirebaseTokenRequest request) {
        FirebaseToken firebaseToken = firebaseVerifier.verify(request.firebaseToken());
        User user = userService.findOrCreate(firebaseToken);
        UUID shopId = shopService.getShopIdByOwnerId(user.getId());
        String accessToken = jwtService.generateAccessToken(user, shopId);
        String refreshToken = jwtService.generateRefreshToken();

        AuthResponse.AuthData data = new AuthResponse.AuthData(
            accessToken,
            refreshToken,
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

    public ResponseEntity<?> refreshToken(RefreshTokenRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("success", false, "error", new ErrorResponse("UNAUTHORIZED", "Invalid refresh token")));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("success", false, "error", new ErrorResponse("UNAUTHORIZED", "Refresh token rotation not implemented in MVP")));
    }
}
