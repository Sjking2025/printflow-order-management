package com.printflow.payments.enums;

/**
 * Identifies which payment method was used for a given payment record.
 * MANUAL_UPI — existing screenshot proof workflow (preserved, unchanged)
 * RAZORPAY   — new automated gateway checkout workflow
 */
public enum PaymentGateway {
    MANUAL_UPI,
    RAZORPAY
}
