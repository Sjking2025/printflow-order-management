package com.printflow.shops.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ShopResponse(
    UUID id,
    String name,
    String address,
    String phone,
    String whatsapp,
    Boolean isOpen,
    String closureMode,
    String closureMsg,
    OffsetDateTime closureUntil,
    Integer lockTimerMins,
    Integer copyModifyWindowMins,
    String upiId,
    String qrCodeUrl
) {}
