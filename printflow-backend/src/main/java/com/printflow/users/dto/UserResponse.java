package com.printflow.users.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String name,
    String email,
    String phone,
    String role,
    String avatarUrl,
    OffsetDateTime createdAt
) {}
