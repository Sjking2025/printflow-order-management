package com.printflow.clarifications.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
    @NotBlank(message = "Message is required")
    @Size(max = 1000, message = "Message must be under 1000 characters")
    String message
) {}
