package com.printflow.payments.service;

import com.printflow.orders.entity.Order;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.payments.dto.GatewayOrderResponse;
import com.printflow.payments.dto.SubmitProofRequest;
import com.printflow.payments.dto.VerifyGatewayPaymentRequest;
import com.printflow.payments.dto.VerifyPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;
import com.printflow.payments.repository.PaymentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final RazorpayService razorpayService;

    public PaymentService(PaymentRepository paymentRepository,
                          OrderRepository orderRepository,
                          RazorpayService razorpayService) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.razorpayService = razorpayService;
    }

    // ── Manual UPI flow — preserved unchanged (uses enum values now) ──────────

    @Transactional
    public Payment submitProof(UUID orderId, SubmitProofRequest request, UUID customerId) {
        Order order = orderRepository.findByIdAndCustomerId(orderId, customerId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        Payment payment = paymentRepository.findByOrderId(orderId)
            .orElseGet(() -> Payment.builder()
                .orderId(orderId)
                .amount(order.getTotalAmount())
                .build());

        payment.setProofUrl(request.proofUrl());
        payment.setGateway(PaymentGateway.MANUAL_UPI);
        payment.setAmount(request.amount());
        payment.setTransactionId(request.transactionId());
        payment.setNotes(request.notes());
        payment.setStatus(PaymentStatus.PROOF_UPLOADED);

        order.setPaymentStatus(PaymentStatus.PROOF_UPLOADED.name());
        order.setPaymentMethod(PaymentGateway.MANUAL_UPI.name());
        orderRepository.save(order);

        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment verifyPayment(UUID paymentId, VerifyPaymentRequest request, UUID ownerId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new EntityNotFoundException("Payment not found"));

        // Parse status string to enum (validates it's a known status)
        PaymentStatus newStatus = PaymentStatus.valueOf(request.status());
        payment.setStatus(newStatus);
        payment.setVerifiedBy(ownerId);
        payment.setVerifiedAt(OffsetDateTime.now());
        payment.setNotes(request.notes());

        if (PaymentStatus.VERIFIED.equals(newStatus)) {
            Order order = orderRepository.findById(payment.getOrderId())
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
            order.setPaymentStatus(PaymentStatus.VERIFIED.name());
            orderRepository.save(order);
        }

        return paymentRepository.save(payment);
    }

    // ── Razorpay gateway flow — delegates to RazorpayService ─────────────────

    /**
     * Creates a Razorpay gateway order for online payment.
     * Delegates to RazorpayService which handles all SDK interactions.
     */
    public GatewayOrderResponse createGatewayOrder(UUID orderId, UUID customerId) {
        return razorpayService.createGatewayOrder(orderId, customerId);
    }

    /**
     * Verifies a Razorpay payment after checkout completes.
     * Delegates to RazorpayService which verifies HMAC signature and auto-accepts.
     */
    public Payment verifyGatewayPayment(VerifyGatewayPaymentRequest request, UUID customerId) {
        return razorpayService.verifyPayment(request, customerId);
    }
}
