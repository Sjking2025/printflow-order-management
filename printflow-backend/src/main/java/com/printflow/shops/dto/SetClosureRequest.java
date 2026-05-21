package com.printflow.shops.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.OffsetDateTime;

public record SetClosureRequest(
    @NotBlank(message = "Mode is required")
    @Pattern(regexp = "OPEN|LUNCH_BREAK|MACHINE_ISSUE|EMERGENCY|CUSTOM",
             message = "Mode must be one of: OPEN, LUNCH_BREAK, MACHINE_ISSUE, EMERGENCY, CUSTOM")
    String mode,

    String message,

    OffsetDateTime until
) {}
