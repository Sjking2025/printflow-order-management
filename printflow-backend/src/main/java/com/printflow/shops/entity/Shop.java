package com.printflow.shops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "shops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(length = 20)
    private String whatsapp;

    @Column(name = "is_open", nullable = false)
    @Builder.Default
    private Boolean isOpen = true;

    @Column(name = "closure_mode", length = 50)
    private String closureMode;

    @Column(name = "closure_msg", columnDefinition = "TEXT")
    private String closureMsg;

    @Column(name = "closure_until")
    private OffsetDateTime closureUntil;

    @Column(name = "lock_timer_mins", nullable = false)
    @Builder.Default
    private Integer lockTimerMins = 5;

    @Column(name = "upi_id", length = 100)
    private String upiId;

    @Column(name = "qr_code_url", columnDefinition = "TEXT")
    private String qrCodeUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
