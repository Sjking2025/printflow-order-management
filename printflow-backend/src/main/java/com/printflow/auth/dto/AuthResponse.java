package com.printflow.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record AuthResponse(
    @JsonProperty("accessToken") String accessToken,
    @JsonProperty("refreshToken") String refreshToken,
    @JsonProperty("expiresIn") long expiresIn,
    @JsonProperty("user") UserInfo user
) {
    public record AuthData(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserInfo user
    ) {}

    public record UserInfo(
        UUID id,
        String name,
        String email,
        String role,
        String avatarUrl
    ) {}
}
