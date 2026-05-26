package com.printflow.payments.dto;

/**
 * Request body for POST /payments/{orderId}/gateway-order
 * Body is intentionally empty — orderId comes from path variable.
 * Record exists for extensibility (future: add payment notes, metadata).
 */
public record CreateGatewayOrderRequest() {}
