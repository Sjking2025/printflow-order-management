package com.printflow.shops.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateShopRequest(
    @NotBlank(message = "Shop name is required")
    String name,
    
    @NotBlank(message = "Owner name is required")
    String ownerName,
    
    @NotBlank(message = "UPI ID is required")
    @Pattern(regexp = "^[\\w.-]+@[\\w.-]+$", message = "Invalid UPI ID format")
    String upiId,
    
    String address,
    String phone,
    String whatsapp
) {}
