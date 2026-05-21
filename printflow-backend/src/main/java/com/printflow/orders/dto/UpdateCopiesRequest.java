package com.printflow.orders.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateCopiesRequest(
    @Min(value = 1, message = "Minimum 1 copy")
    @Max(value = 999, message = "Maximum 999 copies")
    int copies
) {}
