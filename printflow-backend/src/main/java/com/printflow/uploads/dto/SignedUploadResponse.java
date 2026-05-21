package com.printflow.uploads.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SignedUploadResponse(
    @JsonProperty("cloudName") String cloudName,
    @JsonProperty("apiKey") String apiKey,
    @JsonProperty("timestamp") long timestamp,
    @JsonProperty("signature") String signature,
    @JsonProperty("folder") String folder,
    @JsonProperty("expiresAt") long expiresAt
) {
    public String getUploadUrl() {
        return "https://api.cloudinary.com/v1_1/" + cloudName + "/upload";
    }
}
