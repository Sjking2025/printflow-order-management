package com.printflow.payments.exception;

/**
 * Thrown when the Razorpay API call to create a gateway order fails.
 * Wraps RazorpayException from the SDK.
 * Maps to HTTP 502 Bad Gateway in GlobalExceptionHandler.
 */
public class GatewayOrderCreationException extends RuntimeException {
    public GatewayOrderCreationException(String message, Throwable cause) {
        super(message, cause);
    }
}
