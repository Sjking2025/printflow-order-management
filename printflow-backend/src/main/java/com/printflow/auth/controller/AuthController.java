package com.printflow.auth.controller;

import com.printflow.auth.dto.FirebaseTokenRequest;
import com.printflow.auth.dto.RefreshTokenRequest;
import com.printflow.auth.service.AuthService;
import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.users.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyFirebaseToken(@Valid @RequestBody FirebaseTokenRequest request) {
        return authService.verifyAndIssueTokens(request);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refreshToken(request);
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {
        UserResponse response = new UserResponse(
            principal.id(),
            principal.getUsername(),
            principal.email(),
            null,
            principal.role(),
            null,
            null
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
