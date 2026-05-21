package com.printflow.payments.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.payments.dto.SubmitProofRequest;
import com.printflow.payments.dto.VerifyPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

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

    @PatchMapping("/{paymentId}/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyPayment(
            @PathVariable UUID paymentId,
            @Valid @RequestBody VerifyPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Payment payment = paymentService.verifyPayment(paymentId, request, principal.id());
        Map<String, Object> data = Map.of(
            "paymentId", payment.getId(),
            "status", payment.getStatus(),
            "verifiedAt", payment.getVerifiedAt()
        );
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
