package com.printflow.orders;

import com.printflow.orders.service.PriceCalculationService;
import com.printflow.shops.entity.PriceConfig;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class PriceCalculationServiceTest {

    private final PriceCalculationService service = new PriceCalculationService();

    private PriceConfig defaultConfig() {
        return PriceConfig.builder()
            .bwPerPageA4(new BigDecimal("0.50"))
            .colorPerPageA4(new BigDecimal("5.00"))
            .a3Multiplier(new BigDecimal("2.00"))
            .doubleSideDiscount(new BigDecimal("0.10"))
            .spiralBindingFlat(new BigDecimal("30.00"))
            .stapleFlat(new BigDecimal("5.00"))
            .laminationPerPage(new BigDecimal("10.00"))
            .urgencyHighFee(new BigDecimal("20.00"))
            .urgencyCriticalFee(new BigDecimal("50.00"))
            .build();
    }

    @Test
    void shouldCalculateBwDocument() {
        var result = service.calculateDocumentPrice("BW", "A4", "SINGLE", "NONE", "NONE", 1, 1, defaultConfig());
        assertEquals(new BigDecimal("0.50"), result.unitPrice());
        assertEquals(new BigDecimal("0.50"), result.subtotal());
    }

    @Test
    void shouldCalculateColorDocument() {
        var result = service.calculateDocumentPrice("COLOR", "A4", "SINGLE", "NONE", "NONE", 2, 10, defaultConfig());
        assertEquals(new BigDecimal("5.00"), result.unitPrice());
        assertEquals(new BigDecimal("100.00"), result.subtotal());
    }

    @Test
    void shouldApplyA3Multiplier() {
        var result = service.calculateDocumentPrice("BW", "A3", "SINGLE", "NONE", "NONE", 1, 1, defaultConfig());
        // compareTo used because BigDecimal equality is scale-sensitive (1.00 != 1.0000)
        assertEquals(0, new BigDecimal("1.00").compareTo(result.unitPrice()),
            "Expected A3 unit price = 1.00 (0.50 × A3 multiplier 2.00)");
    }

    @Test
    void shouldApplySpiralBinding() {
        var result = service.calculateDocumentPrice("BW", "A4", "DOUBLE", "SPIRAL", "NONE", 1, 10, defaultConfig());
        assertTrue(result.subtotal().compareTo(BigDecimal.valueOf(30)) > 0);
    }

    @Test
    void shouldCalculateUrgencyFee() {
        assertEquals(new BigDecimal("20.00"), service.calculateUrgencyFee("HIGH", defaultConfig()));
        assertEquals(new BigDecimal("50.00"), service.calculateUrgencyFee("CRITICAL", defaultConfig()));
        assertEquals(BigDecimal.ZERO, service.calculateUrgencyFee("NORMAL", defaultConfig()));
    }
}
