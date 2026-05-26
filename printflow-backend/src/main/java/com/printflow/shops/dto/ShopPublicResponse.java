package com.printflow.shops.dto;

import com.printflow.shops.entity.PriceConfig;
import java.util.UUID;

public record ShopPublicResponse(
    UUID id,
    String name,
    String ownerName,
    String address,
    String phone,
    String whatsapp,
    String upiId,
    String qrCodeUrl,
    Boolean isOpen,
    String closureMsg,
    PriceConfig priceConfig
) {}
