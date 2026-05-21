package com.printflow.shops.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

public record UpdatePricesRequest(
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    @Digits(integer = 8, fraction = 2)
    BigDecimal bwPerPageA4,

    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    @Digits(integer = 8, fraction = 2)
    BigDecimal colorPerPageA4,

    @DecimalMin(value = "1.00", message = "Multiplier must be at least 1")
    @Digits(integer = 3, fraction = 2)
    BigDecimal a3Multiplier,

    @Digits(integer = 3, fraction = 2)
    BigDecimal doubleSideDiscount,

    @DecimalMin(value = "0.00", message = "Price must be 0 or more")
    @Digits(integer = 8, fraction = 2)
    BigDecimal spiralBindingFlat,

    @DecimalMin(value = "0.00", message = "Price must be 0 or more")
    @Digits(integer = 8, fraction = 2)
    BigDecimal stapleFlat,

    @DecimalMin(value = "0.00", message = "Price must be 0 or more")
    @Digits(integer = 8, fraction = 2)
    BigDecimal laminationPerPage,

    @DecimalMin(value = "0.00", message = "Fee must be 0 or more")
    @Digits(integer = 8, fraction = 2)
    BigDecimal urgencyHighFee,

    @DecimalMin(value = "0.00", message = "Fee must be 0 or more")
    @Digits(integer = 8, fraction = 2)
    BigDecimal urgencyCriticalFee
) {}
