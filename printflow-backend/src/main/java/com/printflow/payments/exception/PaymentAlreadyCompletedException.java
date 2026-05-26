package com.printflow.payments.exception;

/**
 * Thrown when a customer attempts to pay for an order that is already paid.
 * Maps to HTTP 409 Conflict in GlobalExceptionHandler.
 */
public class PaymentAlreadyCompletedException extends RuntimeException {
    public PaymentAlreadyCompletedException(String orderId) {
        super("Payment already completed for order: " + orderId);
    }
}
