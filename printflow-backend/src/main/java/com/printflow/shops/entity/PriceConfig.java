package com.printflow.shops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "price_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "shop_id", nullable = false, unique = true)
    private UUID shopId;

    @Column(name = "bw_per_page_a4", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal bwPerPageA4 = new BigDecimal("0.50");

    @Column(name = "color_per_page_a4", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal colorPerPageA4 = new BigDecimal("5.00");

    @Column(name = "a3_multiplier", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal a3Multiplier = new BigDecimal("2.00");

    @Column(name = "double_side_discount", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal doubleSideDiscount = BigDecimal.ZERO;

    @Column(name = "spiral_binding_flat", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal spiralBindingFlat = new BigDecimal("30.00");

    @Column(name = "staple_flat", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal stapleFlat = new BigDecimal("5.00");

    @Column(name = "lamination_per_page", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal laminationPerPage = new BigDecimal("10.00");

    @Column(name = "urgency_high_fee", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal urgencyHighFee = new BigDecimal("20.00");

    @Column(name = "urgency_critical_fee", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal urgencyCriticalFee = new BigDecimal("50.00");

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
