package com.printflow.orders.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;

public record UpdateStatusRequest(
    @NotBlank(message = "Status is required")
    String status,

    String note,

    String delayReason,

    OffsetDateTime delayUntil
) {}
