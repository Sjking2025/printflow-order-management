package com.printflow.payments.dto;

import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Generic payment response DTO.
 * Returned by endpoints that expose payment data to clients.
 * Uses typed enums instead of raw strings.
 */
public record PaymentResponse(
    UUID id,
    UUID orderId,
    BigDecimal amount,
    PaymentGateway gateway,
    PaymentStatus status,
    String proofUrl,
    String transactionId,
    String gatewayOrderId,
    String gatewayPaymentId,
    OffsetDateTime paidAt,
    OffsetDateTime verifiedAt,
    OffsetDateTime createdAt
) {}
