package com.printflow.payments.repository;

import com.printflow.payments.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    // Existing — preserved for Manual UPI flow
    Optional<Payment> findByOrderId(UUID orderId);

    // New — find by Razorpay's gateway order ID (used in webhook + verify)
    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);

    // New — find by Razorpay's payment ID (deduplication guard)
    Optional<Payment> findByGatewayPaymentId(String gatewayPaymentId);

    // New — idempotency check: has this webhook event been processed before?
    boolean existsByIdempotencyKey(String idempotencyKey);

    // New — check if an order's payment is already in a terminal paid state
    // Covers both Razorpay PAID and Manual UPI VERIFIED paths
    @Query("SELECT COUNT(p) > 0 FROM Payment p " +
           "WHERE p.orderId = :orderId " +
           "AND p.status IN ('PAID', 'VERIFIED')")
    boolean existsPaidPaymentForOrder(@Param("orderId") UUID orderId);
}
