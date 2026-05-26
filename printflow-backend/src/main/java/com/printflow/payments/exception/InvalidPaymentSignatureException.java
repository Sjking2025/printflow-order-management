package com.printflow.payments.exception;

/**
 * Thrown when Razorpay HMAC-SHA256 signature verification fails.
 * Covers both client-side verify and webhook signature mismatch.
 * Maps to HTTP 400 Bad Request in GlobalExceptionHandler.
 */
public class InvalidPaymentSignatureException extends RuntimeException {
    public InvalidPaymentSignatureException() {
        super("Razorpay payment signature verification failed");
    }
}
