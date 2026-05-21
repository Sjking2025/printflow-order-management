package com.printflow.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record FirebaseTokenRequest(
    @NotBlank(message = "Firebase token is required")
    String firebaseToken
) {}
