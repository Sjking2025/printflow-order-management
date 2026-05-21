package com.printflow.orders.service;

import com.printflow.shops.entity.PriceConfig;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PriceCalculationService {

    public record CalculatedDocumentPrice(
        BigDecimal unitPrice,
        BigDecimal subtotal
    ) {}

    public CalculatedDocumentPrice calculateDocumentPrice(
            String printType, String paperSize, String sideType,
            String binding, String lamination,
            int copies, int pageCount, PriceConfig config) {

        boolean isColor = "COLOR".equals(printType);
        boolean isA3 = "A3".equals(paperSize);
        boolean isDoubleSide = "DOUBLE".equals(sideType);

        BigDecimal baseRate = isColor ? config.getColorPerPageA4() : config.getBwPerPageA4();

        if (isA3) {
            baseRate = baseRate.multiply(config.getA3Multiplier());
        }

        BigDecimal pagePrice = baseRate;

        if (isDoubleSide && config.getDoubleSideDiscount().compareTo(BigDecimal.ZERO) > 0) {
            pagePrice = pagePrice.subtract(config.getDoubleSideDiscount());
            if (pagePrice.compareTo(BigDecimal.ZERO) < 0) {
                pagePrice = BigDecimal.ZERO;
            }
        }

        BigDecimal totalPageCost = pagePrice.multiply(BigDecimal.valueOf(pageCount))
            .multiply(BigDecimal.valueOf(copies));

        BigDecimal bindingCost = switch (binding) {
            case "SPIRAL" -> config.getSpiralBindingFlat();
            case "STAPLE" -> config.getStapleFlat();
            default -> BigDecimal.ZERO;
        };

        BigDecimal laminationCost = switch (lamination) {
            case "SINGLE_SIDE", "BOTH_SIDES" -> config.getLaminationPerPage()
                .multiply(lamination.equals("BOTH_SIDES") ? BigDecimal.valueOf(2) : BigDecimal.ONE);
            default -> BigDecimal.ZERO;
        };

        BigDecimal subtotal = totalPageCost.add(bindingCost).add(laminationCost);

        return new CalculatedDocumentPrice(baseRate, subtotal);
    }

    public BigDecimal calculateUrgencyFee(String urgency, PriceConfig config) {
        return switch (urgency) {
            case "HIGH" -> config.getUrgencyHighFee();
            case "CRITICAL" -> config.getUrgencyCriticalFee();
            default -> BigDecimal.ZERO;
        };
    }

    public BigDecimal calculateOrderTotal(BigDecimal documentsTotal, BigDecimal urgencyFee) {
        return documentsTotal.add(urgencyFee).setScale(2, RoundingMode.HALF_UP);
    }
}
