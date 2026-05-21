package com.printflow.uploads.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record SignUploadRequest(
    @NotBlank(message = "File name is required")
    String fileName,

    @NotBlank(message = "File type is required")
    String fileType,

    @Positive(message = "File size must be positive")
    long fileSizeKb
) {}
