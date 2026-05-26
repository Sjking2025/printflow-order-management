package com.printflow.payments.service;

import com.printflow.orders.entity.Order;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.payments.dto.SubmitProofRequest;
import com.printflow.payments.dto.VerifyPaymentRequest;
import com.printflow.payments.entity.Payment;
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

    public PaymentService(PaymentRepository paymentRepository,
                          OrderRepository orderRepository) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
    }

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
        payment.setMethod(request.method());
        payment.setAmount(request.amount());
        payment.setTransactionId(request.transactionId());
        payment.setNotes(request.notes());
        payment.setStatus("PROOF_UPLOADED");

        order.setPaymentStatus("PROOF_UPLOADED");
        orderRepository.save(order);

        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment verifyPayment(UUID paymentId, VerifyPaymentRequest request, UUID ownerId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new EntityNotFoundException("Payment not found"));

        payment.setStatus(request.status());
        payment.setVerifiedBy(ownerId);
        payment.setVerifiedAt(OffsetDateTime.now());
        payment.setNotes(request.notes());

        if ("VERIFIED".equals(request.status())) {
            Order order = orderRepository.findById(payment.getOrderId())
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
            order.setPaymentStatus("VERIFIED");
            orderRepository.save(order);
        }

        return paymentRepository.save(payment);
    }
}
