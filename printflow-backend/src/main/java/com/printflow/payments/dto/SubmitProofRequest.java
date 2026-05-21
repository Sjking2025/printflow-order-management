package com.printflow.payments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SubmitProofRequest(
    @NotBlank(message = "Proof URL is required")
    String proofUrl,

    @NotBlank(message = "Payment method is required")
    String method,

    @NotNull(message = "Amount is required")
    BigDecimal amount,

    String notes
) {}
