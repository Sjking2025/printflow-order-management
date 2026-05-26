package com.printflow.payments.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /payments/verify
 * Contains the three values Razorpay returns to the frontend after payment.
 * All three are required — missing any one makes signature verification impossible.
 */
public record VerifyGatewayPaymentRequest(
    @NotBlank(message = "razorpayOrderId is required")
    String razorpayOrderId,

    @NotBlank(message = "razorpayPaymentId is required")
    String razorpayPaymentId,

    @NotBlank(message = "razorpaySignature is required")
    String razorpaySignature
) {}
