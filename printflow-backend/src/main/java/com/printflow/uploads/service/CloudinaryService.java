package com.printflow.uploads.service;

import com.cloudinary.Cloudinary;
import com.printflow.uploads.dto.SignedUploadResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final FileValidationService fileValidationService;

    public CloudinaryService(Cloudinary cloudinary,
                             FileValidationService fileValidationService) {
        this.cloudinary = cloudinary;
        this.fileValidationService = fileValidationService;
    }

    public SignedUploadResponse generateSignedUrl(String fileName, String fileType, long fileSizeKb) {
        fileValidationService.validate(fileName, fileType, fileSizeKb);

        long timestamp = Instant.now().getEpochSecond();
        String folder = "orders/temp";

        Map<String, Object> params = Map.of(
            "timestamp", timestamp,
            "folder", folder
        );

        String signature = cloudinary.apiSignRequest(params, cloudinary.config.apiSecret);
        long expiresAt = timestamp + 60;

        return new SignedUploadResponse(
            cloudinary.config.cloudName,
            cloudinary.config.apiKey,
            timestamp,
            signature,
            folder,
            expiresAt
        );
    }
}
