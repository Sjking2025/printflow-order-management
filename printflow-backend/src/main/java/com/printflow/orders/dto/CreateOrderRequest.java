package com.printflow.orders.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    @NotNull(message = "Shop ID is required")
    UUID shopId,

    @NotBlank(message = "Urgency is required")
    String urgency,

    @Future(message = "Delivery must be in the future")
    OffsetDateTime expectedDelivery,

    @Size(max = 500, message = "Description max 500 characters")
    String description,

    @NotEmpty(message = "At least one document is required")
    @Size(min = 1, max = 5, message = "Between 1 and 5 documents allowed")
    @Valid
    List<DocumentRequest> documents
) {}
