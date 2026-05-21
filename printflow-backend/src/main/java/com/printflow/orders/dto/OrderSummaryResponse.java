package com.printflow.orders.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OrderSummaryResponse(
    UUID id,
    String orderNumber,
    String status,
    String urgency,
    int documentCount,
    BigDecimal totalAmount,
    String paymentStatus,
    OffsetDateTime expectedDelivery,
    OffsetDateTime createdAt
) {}
