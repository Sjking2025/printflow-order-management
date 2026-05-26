package com.printflow.payments.service;

import com.printflow.notifications.service.NotificationService;
import com.printflow.orders.entity.Order;
import com.printflow.orders.enums.OrderStatus;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.payments.config.RazorpayConfig;
import com.printflow.payments.dto.GatewayOrderResponse;
import com.printflow.payments.dto.VerifyGatewayPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;
import com.printflow.payments.exception.GatewayOrderCreationException;
import com.printflow.payments.exception.InvalidPaymentSignatureException;
import com.printflow.payments.exception.PaymentAlreadyCompletedException;
import com.printflow.payments.repository.PaymentRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import jakarta.persistence.EntityNotFoundException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Gateway abstraction for all Razorpay operations.
 *
 * Responsibilities:
 * - Create Razorpay orders via SDK
 * - Verify payment signatures (client-side post-checkout)
 * - Process webhook events with idempotency protection
 * - Update Payment + Order status transactionally
 * - Trigger async notifications
 *
 * If the payment gateway ever changes, only this class needs modification.
 */
@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private static final String CURRENCY = "INR";

    private final RazorpayClient razorpayClient;
    private final RazorpayConfig razorpayConfig;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;

    public RazorpayService(RazorpayClient razorpayClient,
                           RazorpayConfig razorpayConfig,
                           PaymentRepository paymentRepository,
                           OrderRepository orderRepository,
                           NotificationService notificationService) {
        this.razorpayClient = razorpayClient;
        this.razorpayConfig = razorpayConfig;
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
    }

    /**
     * Creates a Razorpay order for the given PrintFlow order.
     *
     * Flow:
     * 1. Validate order exists + belongs to customer
     * 2. Guard: reject if already paid or cancelled
     * 3. Create Razorpay order via API (amount in paise)
     * 4. Persist Payment record with GATEWAY_INITIATED status
     * 5. Return gateway order details for frontend checkout
     *
     * @param orderId    PrintFlow order UUID
     * @param customerId Authenticated customer UUID (from JWT)
     * @return GatewayOrderResponse containing Razorpay order ID, amount, and public key
     */
    @Transactional
    public GatewayOrderResponse createGatewayOrder(UUID orderId, UUID customerId) {
        // 1. Load and validate order — enforces ownership
        Order order = orderRepository.findByIdAndCustomerId(orderId, customerId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found or access denied"));

        // 2. Guard: cannot pay for an already-paid or cancelled order
        if (paymentRepository.existsPaidPaymentForOrder(orderId)) {
            throw new PaymentAlreadyCompletedException(orderId.toString());
        }
        if ("CANCELLED".equals(order.getStatus())) {
            throw new IllegalStateException("Cannot pay for a cancelled order");
        }

        // 3. Create Razorpay order — amount must be in paise (1 INR = 100 paise)
        long amountInPaise = order.getTotalAmount()
            .multiply(BigDecimal.valueOf(100))
            .longValueExact();

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", CURRENCY);
        orderRequest.put("receipt", order.getOrderNumber());  // Visible in Razorpay dashboard
        orderRequest.put("notes", new JSONObject()
            .put("printflow_order_id", orderId.toString())
            .put("order_number", order.getOrderNumber()));

        com.razorpay.Order razorpayOrder;
        try {
            razorpayOrder = razorpayClient.orders.create(orderRequest);
            log.info("Razorpay order created: {} for PrintFlow order: {}",
                razorpayOrder.get("id"), order.getOrderNumber());
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for order {}: {}",
                order.getOrderNumber(), e.getMessage());
            throw new GatewayOrderCreationException(
                "Failed to create gateway order: " + e.getMessage(), e);
        }

        // 4. Persist Payment record — upsert (update existing or create new)
        String razorpayOrderId = razorpayOrder.get("id");

        Payment payment = paymentRepository.findByOrderId(orderId)
            .orElseGet(() -> Payment.builder()
                .orderId(orderId)
                .amount(order.getTotalAmount())
                .build());

        payment.setGateway(PaymentGateway.RAZORPAY);
        payment.setStatus(PaymentStatus.GATEWAY_INITIATED);
        payment.setGatewayOrderId(razorpayOrderId);

        // Update order payment tracking fields
        order.setPaymentMethod("RAZORPAY");
        order.setPaymentStatus(PaymentStatus.GATEWAY_INITIATED.name());

        orderRepository.save(order);
        paymentRepository.save(payment);

        // 5. Return checkout details for frontend to open Razorpay modal
        return new GatewayOrderResponse(
            razorpayOrderId,
            order.getTotalAmount(),
            CURRENCY,
            razorpayConfig.getKeyId(),
            order.getOrderNumber(),
            payment.getId().toString()
        );
    }

    /**
     * Verifies payment after customer completes Razorpay checkout.
     *
     * Razorpay returns three values to the frontend after payment:
     * - razorpayOrderId  (same as what we created)
     * - razorpayPaymentId (new — the actual payment transaction ID)
     * - razorpaySignature (HMAC-SHA256 of orderId + "|" + paymentId, signed with key secret)
     *
     * We verify the signature, then mark the order as PAID + ACCEPTED.
     *
     * @param request    The three post-payment values from Razorpay
     * @param customerId Authenticated customer UUID (ownership verification)
     * @return Updated Payment record
     */
    @Transactional
    public Payment verifyPayment(VerifyGatewayPaymentRequest request, UUID customerId) {
        // 1. Find payment by gateway order ID
        Payment payment = paymentRepository.findByGatewayOrderId(request.razorpayOrderId())
            .orElseThrow(() -> new EntityNotFoundException(
                "Payment not found for gateway order: " + request.razorpayOrderId()));

        // 2. Verify customer owns this payment (via order ownership)
        Order order = orderRepository.findByIdAndCustomerId(payment.getOrderId(), customerId)
            .orElseThrow(() -> new EntityNotFoundException("Order access denied"));

        // 3. Idempotency: if already verified, return current state without re-processing
        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            log.info("Payment already verified for order: {}", order.getOrderNumber());
            return payment;
        }

        // 4. Verify HMAC-SHA256 signature
        // Razorpay signs: razorpayOrderId + "|" + razorpayPaymentId with the key secret
        verifyPaymentSignature(
            request.razorpayOrderId(),
            request.razorpayPaymentId(),
            request.razorpaySignature()
        );

        // 5. Update payment record to PAID
        payment.setStatus(PaymentStatus.PAID);
        payment.setGatewayPaymentId(request.razorpayPaymentId());
        payment.setGatewaySignature(request.razorpaySignature());
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepository.save(payment);

        // 6. Auto-accept the order and trigger notifications
        autoAcceptOrderOnPayment(order, request.razorpayPaymentId());

        log.info("Payment verified and order auto-accepted: {} (payment: {})",
            order.getOrderNumber(), request.razorpayPaymentId());

        return payment;
    }

    /**
     * Processes incoming Razorpay webhook events.
     *
     * Supported events:
     * - payment.captured → mark PAID, auto-accept order (idempotent with client-side verify)
     * - payment.failed   → mark FAILED, update order payment status
     *
     * Idempotency: each event is processed at most once via idempotency_key in DB.
     *
     * @param eventType  Razorpay event type (e.g., "payment.captured")
     * @param payload    Parsed webhook payload JSON
     */
    @Transactional
    public void processWebhookEvent(String eventType, JSONObject payload) {
        JSONObject paymentEntity = payload
            .getJSONObject("payload")
            .getJSONObject("payment")
            .getJSONObject("entity");

        String razorpayOrderId = paymentEntity.getString("order_id");
        String razorpayPaymentId = paymentEntity.getString("id");

        // Build idempotency key: gateway_order_id + ":" + event_type
        String idempotencyKey = razorpayOrderId + ":" + eventType;

        // Idempotency check: if already processed, return immediately (safe re-delivery)
        if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.info("Duplicate webhook event, skipping: {}", idempotencyKey);
            return;
        }

        // Find payment by gateway order ID
        Payment payment = paymentRepository.findByGatewayOrderId(razorpayOrderId).orElse(null);

        if (payment == null) {
            log.warn("Webhook received for unknown gateway order: {}", razorpayOrderId);
            return;
        }

        switch (eventType) {
            case "payment.captured" ->
                handlePaymentCaptured(payment, razorpayPaymentId, idempotencyKey, payload);
            case "payment.failed" ->
                handlePaymentFailed(payment, idempotencyKey);
            default ->
                log.debug("Unhandled webhook event type: {}", eventType);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void handlePaymentCaptured(Payment payment, String razorpayPaymentId,
                                       String idempotencyKey, JSONObject fullPayload) {
        // If already PAID (from client-side verify), just record the idempotency key
        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            payment.setIdempotencyKey(idempotencyKey);
            paymentRepository.save(payment);
            log.info("Webhook: payment already PAID, idempotency key saved: {}", idempotencyKey);
            return;
        }

        // Mark as PAID and record audit data
        payment.setStatus(PaymentStatus.PAID);
        payment.setGatewayPaymentId(razorpayPaymentId);
        payment.setPaidAt(OffsetDateTime.now());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setWebhookPayload(fullPayload.toString());
        paymentRepository.save(payment);

        // Auto-accept the order
        Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null) {
            autoAcceptOrderOnPayment(order, razorpayPaymentId);
        }

        log.info("Webhook: payment captured and order auto-accepted for gateway order: {}",
            payment.getGatewayOrderId());
    }

    private void handlePaymentFailed(Payment payment, String idempotencyKey) {
        payment.setStatus(PaymentStatus.FAILED);
        payment.setIdempotencyKey(idempotencyKey);
        paymentRepository.save(payment);

        Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null) {
            order.setPaymentStatus(PaymentStatus.FAILED.name());
            orderRepository.save(order);
        }

        log.info("Webhook: payment failed for gateway order: {}", payment.getGatewayOrderId());
    }

    /**
     * Handles order state transitions after successful payment.
     * Updates payment status to PAID and auto-accepts if order is still PENDING.
     * Idempotent: skips auto-accept if order is already in a later state.
     */
    private void autoAcceptOrderOnPayment(Order order, String gatewayPaymentId) {
        order.setPaymentStatus(PaymentStatus.PAID.name());

        if ("PENDING".equals(order.getStatus())) {
            order.setStatus(OrderStatus.ACCEPTED.name());
            orderRepository.save(order);

            // Trigger async notifications (both customer and owner)
            notificationService.notifyOrderStatusChange(order, OrderStatus.ACCEPTED);
            notificationService.notifyGatewayPaymentSuccessToOwner(order);
        } else {
            // Order may have been manually accepted already — just save payment status
            orderRepository.save(order);
            log.warn("Auto-accept skipped — order {} is already in status: {}",
                order.getOrderNumber(), order.getStatus());
        }
    }

    /**
     * Verifies HMAC-SHA256 signature from Razorpay.
     * Razorpay signature = HMAC-SHA256(keySecret, razorpayOrderId + "|" + razorpayPaymentId)
     *
     * @throws InvalidPaymentSignatureException if signature does not match
     */
    private void verifyPaymentSignature(String razorpayOrderId,
                                        String razorpayPaymentId,
                                        String receivedSignature) {
        try {
            String data = razorpayOrderId + "|" + razorpayPaymentId;
            String expectedSignature = Utils.getHash(data, razorpayConfig.getKeySecret());

            if (!expectedSignature.equals(receivedSignature)) {
                log.warn("Payment signature mismatch for order: {}", razorpayOrderId);
                throw new InvalidPaymentSignatureException();
            }
        } catch (InvalidPaymentSignatureException e) {
            throw e;
        } catch (Exception e) {
            log.error("Signature verification error for order {}: {}",
                razorpayOrderId, e.getMessage());
            throw new InvalidPaymentSignatureException();
        }
    }
}
