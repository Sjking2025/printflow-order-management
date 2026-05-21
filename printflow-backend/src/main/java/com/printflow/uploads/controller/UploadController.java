package com.printflow.uploads.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.uploads.dto.SignUploadRequest;
import com.printflow.uploads.dto.SignedUploadResponse;
import com.printflow.uploads.service.CloudinaryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/uploads")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    public UploadController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    @PostMapping("/sign")
    public ResponseEntity<?> getSignedUploadUrl(@Valid @RequestBody SignUploadRequest request) {
        try {
            SignedUploadResponse response = cloudinaryService.generateSignedUrl(
                request.fileName(), request.fileType(), request.fileSizeKb());

            Map<String, Object> data = Map.of(
                "uploadUrl", response.getUploadUrl(),
                "signature", response.signature(),
                "apiKey", response.apiKey(),
                "timestamp", response.timestamp(),
                "folder", response.folder(),
                "expiresAt", response.expiresAt()
            );

            return ResponseEntity.ok(ApiResponse.success(data));
        } catch (IllegalArgumentException e) {
            String msg = e.getMessage();
            HttpStatus status = HttpStatus.UNPROCESSABLE_ENTITY;
            String code = "VALIDATION_ERROR";

            if (msg.contains("File type not allowed")) {
                status = HttpStatus.UNSUPPORTED_MEDIA_TYPE;
                code = "INVALID_FILE_TYPE";
            } else if (msg.contains("exceeds 20MB")) {
                status = HttpStatus.PAYLOAD_TOO_LARGE;
                code = "FILE_TOO_LARGE";
            } else if (msg.contains("Invalid file name")) {
                status = HttpStatus.UNPROCESSABLE_ENTITY;
                code = "VALIDATION_ERROR";
            }

            return ResponseEntity.status(status)
                .body(Map.of("success", false, "error",
                    Map.of("code", code, "message", msg)));
        }
    }
}
