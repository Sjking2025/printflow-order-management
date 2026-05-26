package com.printflow.orders.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ShopCustomerStats(
    UUID customerId,
    String customerName,
    String customerEmail,
    long orderCount,
    OffsetDateTime latestOrderDate
) {}