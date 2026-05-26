package com.printflow.payments.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.payments.dto.GatewayOrderResponse;
import com.printflow.payments.dto.SubmitProofRequest;
import com.printflow.payments.dto.VerifyGatewayPaymentRequest;
import com.printflow.payments.dto.VerifyPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // ── Existing: Manual UPI proof submission ──────────────────
    // PRESERVED UNCHANGED — existing customers continue using this flow
    @PostMapping("/{orderId}/proof")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitProof(
            @PathVariable UUID orderId,
            @Valid @RequestBody SubmitProofRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Payment payment = paymentService.submitProof(orderId, request, principal.id());
        Map<String, Object> data = Map.of(
            "paymentId", payment.getId(),
            "status", payment.getStatus()
        );
        return ResponseEntity.ok(ApiResponse.success(data,
            "Payment proof submitted. Owner will verify and accept your order."));
    }

    // ── Existing: Owner manual verification ───────────────────
    // PRESERVED UNCHANGED
    @PatchMapping("/{paymentId}/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyPayment(
            @PathVariable UUID paymentId,
            @Valid @RequestBody VerifyPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Payment payment = paymentService.verifyPayment(paymentId, request, principal.id());
        Map<String, Object> data = new HashMap<>();
        data.put("paymentId", payment.getId());
        data.put("status", payment.getStatus());
        data.put("verifiedAt", payment.getVerifiedAt());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── NEW: Create Razorpay gateway order ────────────────────
    /**
     * POST /api/v1/payments/{orderId}/gateway-order
     * Auth: JWT (any authenticated customer)
     *
     * Creates a Razorpay order and returns checkout details.
     * The frontend passes these directly to the Razorpay Checkout SDK.
     *
     * Validations performed by service:
     * - Order must exist and belong to authenticated customer
     * - Order must not already be paid (PAID or VERIFIED)
     * - Order must not be in CANCELLED status
     *
     * Responses:
     * 200 → {gatewayOrderId, amount, currency, keyId, orderNumber, paymentId}
     * 404 → Order not found or access denied
     * 409 → Payment already completed
     * 502 → Razorpay gateway unavailable
     */
    @PostMapping("/{orderId}/gateway-order")
    public ResponseEntity<ApiResponse<GatewayOrderResponse>> createGatewayOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal) {
        GatewayOrderResponse response =
            paymentService.createGatewayOrder(orderId, principal.id());
        return ResponseEntity.ok(ApiResponse.success(response,
            "Gateway order created. Proceed to checkout."));
    }

    // ── NEW: Verify Razorpay payment (client-side) ────────────
    /**
     * POST /api/v1/payments/verify
     * Auth: JWT (any authenticated customer)
     *
     * Called by frontend after Razorpay checkout completes successfully.
     * Verifies HMAC-SHA256 signature and auto-accepts the order.
     *
     * Responses:
     * 200 → {verified: true, paymentId, orderId, status: "PAID"}
     * 400 → Invalid signature
     * 404 → Payment/order not found
     */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyGatewayPayment(
            @Valid @RequestBody VerifyGatewayPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Payment payment = paymentService.verifyGatewayPayment(request, principal.id());
        Map<String, Object> data = Map.of(
            "verified", true,
            "paymentId", payment.getId(),
            "orderId", payment.getOrderId(),
            "status", payment.getStatus().name()
        );
        return ResponseEntity.ok(ApiResponse.success(data,
            "Payment verified. Your order has been accepted!"));
    }
}
