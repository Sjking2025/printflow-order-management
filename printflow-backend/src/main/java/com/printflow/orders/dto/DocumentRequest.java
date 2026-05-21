package com.printflow.orders.dto;

import jakarta.validation.constraints.*;

public record DocumentRequest(
    @NotBlank(message = "File name is required")
    String fileName,

    @NotBlank(message = "File URL is required")
    String fileUrl,

    Integer fileSizeKb,

    Integer pageCount,

    @Min(value = 1, message = "Minimum 1 copy")
    @Max(value = 999, message = "Maximum 999 copies")
    int copies,

    @NotBlank(message = "Print type is required")
    String printType,

    @NotBlank(message = "Side type is required")
    String sideType,

    @NotBlank(message = "Paper size is required")
    String paperSize,

    @NotBlank(message = "Binding is required")
    String binding,

    @NotBlank(message = "Lamination is required")
    String lamination,

    @Size(max = 200, message = "Notes max 200 characters")
    String notes
) {}
