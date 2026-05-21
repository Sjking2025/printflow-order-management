package com.printflow.payments.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyPaymentRequest(
    @NotBlank(message = "Status is required")
    String status,

    String notes
) {}
