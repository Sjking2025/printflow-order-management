package com.printflow.uploads.service;

import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class FileValidationService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
    );

    private static final long MAX_FILE_SIZE_KB = 20 * 1024;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".pdf", ".docx", ".jpg", ".jpeg", ".png"
    );

    public void validate(String fileName, String mimeType, long fileSizeKb) {
        if (!ALLOWED_TYPES.contains(mimeType)) {
            String ext = fileName.contains(".") ?
                fileName.substring(fileName.lastIndexOf(".")).toLowerCase() : "";
            if (!ALLOWED_EXTENSIONS.contains(ext)) {
                throw new IllegalArgumentException("File type not allowed: " + mimeType);
            }
        }

        if (fileSizeKb > MAX_FILE_SIZE_KB) {
            throw new IllegalArgumentException("File exceeds 20MB limit");
        }

        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new IllegalArgumentException("Invalid file name");
        }
    }
}
