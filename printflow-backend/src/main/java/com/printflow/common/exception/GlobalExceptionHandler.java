package com.printflow.common.exception;

import com.printflow.orders.exception.InvalidStatusTransitionException;
import com.printflow.orders.exception.OrderLockExpiredException;
import com.printflow.payments.exception.GatewayOrderCreationException;
import com.printflow.payments.exception.InvalidPaymentSignatureException;
import com.printflow.payments.exception.PaymentAlreadyCompletedException;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(EntityNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(OrderLockExpiredException.class)
    public ResponseEntity<Map<String, Object>> handleOrderLock(OrderLockExpiredException ex) {
        return buildError(HttpStatus.CONFLICT, "ORDER_LOCK_EXPIRED", ex.getMessage(), "copies");
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidTransition(InvalidStatusTransitionException ex) {
        return buildError(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldError();
        String field = fieldError != null ? fieldError.getField() : "unknown";
        String message = fieldError != null ? fieldError.getDefaultMessage() : "Validation failed";
        return buildError(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message, field);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(AccessDeniedException ex) {
        return buildError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadArgument(IllegalArgumentException ex) {
        return buildError(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return buildError(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(PaymentAlreadyCompletedException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentAlreadyCompleted(
            PaymentAlreadyCompletedException ex) {
        return buildError(HttpStatus.CONFLICT, "PAYMENT_ALREADY_COMPLETED", ex.getMessage());
    }

    @ExceptionHandler(InvalidPaymentSignatureException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidSignature(
            InvalidPaymentSignatureException ex) {
        return buildError(HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_SIGNATURE", ex.getMessage());
    }

    @ExceptionHandler(GatewayOrderCreationException.class)
    public ResponseEntity<Map<String, Object>> handleGatewayError(
            GatewayOrderCreationException ex) {
        log.error("Gateway order creation failed", ex);
        return buildError(HttpStatus.BAD_GATEWAY, "GATEWAY_ERROR",
            "Payment gateway unavailable. Please try again.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred");
    }

    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String code, String message) {
        return buildError(status, code, message, null);
    }

    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String code, String message, String field) {
        ErrorResponse error = new ErrorResponse(code, message, field);
        Map<String, Object> body = Map.of(
            "success", false,
            "error", error
        );
        return ResponseEntity.status(status).body(body);
    }
}
