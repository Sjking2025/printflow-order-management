package com.printflow.users.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.users.dto.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(
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
