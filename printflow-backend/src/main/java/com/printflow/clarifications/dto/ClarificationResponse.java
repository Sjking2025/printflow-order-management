package com.printflow.clarifications.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClarificationResponse(
    UUID id,
    String senderRole,
    String message,
    boolean isRead,
    OffsetDateTime createdAt
) {}
