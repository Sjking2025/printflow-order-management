package com.printflow.payments.dto;

import java.math.BigDecimal;

/**
 * Response to POST /payments/{orderId}/gateway-order
 * The frontend passes these values directly to the Razorpay Checkout SDK.
 *
 * @param gatewayOrderId  Razorpay order ID (order_xxx) — passed as order_id to checkout
 * @param amount          Amount in INR (not paise — frontend multiplies by 100)
 * @param currency        Always "INR" for now
 * @param keyId           Razorpay public key (rzp_test_xxx or rzp_live_xxx)
 * @param orderNumber     PrintFlow order number — shown in Razorpay UI
 * @param paymentId       Our internal Payment UUID for tracking
 */
public record GatewayOrderResponse(
    String gatewayOrderId,
    BigDecimal amount,
    String currency,
    String keyId,
    String orderNumber,
    String paymentId
) {}
