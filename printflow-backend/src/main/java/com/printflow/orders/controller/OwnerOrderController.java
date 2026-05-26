package com.printflow.orders.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.orders.dto.OrderResponse;
import com.printflow.orders.dto.UpdateStatusRequest;
import com.printflow.orders.entity.Order;
import com.printflow.orders.service.OrderService;
import com.printflow.orders.service.OrderStatusService;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.repository.PaymentRepository;
import com.printflow.users.repository.UserRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class OwnerOrderController {

    private final OrderService orderService;
    private final OrderStatusService orderStatusService;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    public OwnerOrderController(OrderService orderService,
                                OrderStatusService orderStatusService,
                                PaymentRepository paymentRepository,
                                UserRepository userRepository) {
        this.orderService = orderService;
        this.orderStatusService = orderStatusService;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/owner/orders/{orderId}")
    @Transactional
    public ResponseEntity<ApiResponse<OrderResponse>> getOwnerOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Order order = orderService.getOrderForOwner(orderId, principal.id());
        OrderResponse response = buildOrderResponse(order);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    private OrderResponse buildOrderResponse(Order order) {
        OrderResponse.OrderCustomerInfo customer = order.getCustomerId() != null
            ? userRepository.findById(order.getCustomerId())
                .map(u -> new OrderResponse.OrderCustomerInfo(u.getId(), u.getName(), u.getPhone()))
                .orElse(null)
            : null;

        List<OrderResponse.DocumentResponse> documentResponses = null;
        if (order.getDocuments() != null) {
            documentResponses = order.getDocuments().stream()
                .map(doc -> new OrderResponse.DocumentResponse(
                    doc.getId(), doc.getFileName(), doc.getFileUrl(),
                    doc.getPageCount(), doc.getCopies(),
                    doc.getPrintType(), doc.getSideType(),
                    doc.getPaperSize(), doc.getBinding(),
                    doc.getLamination(), doc.getNotes(),
                    doc.getSubtotal(),
                    doc.getCopiesModifiedAt()
                ))
                .toList();
        }

        OrderResponse.PaymentInfo payment = null;
        Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
        if (paymentOpt.isPresent()) {
            Payment p = paymentOpt.get();
            payment = new OrderResponse.PaymentInfo(
                p.getId(), p.getAmount(), p.getMethod(),
                p.getStatus(), p.getProofUrl(),
                p.getTransactionId(), p.getVerifiedAt()
            );
        }

        return new OrderResponse(
            order.getId(), order.getOrderNumber(),
            order.getStatus(), order.getUrgency(),
            order.getExpectedDelivery(), order.getDescription(),
            order.getTotalAmount(), order.getPaymentStatus(),
            order.getLockExpiresAt(), order.getCopyModifyExpiresAt(),
            order.getProcessingStartedAt(),
            customer, documentResponses, payment, null, null,
            order.getCreatedAt()
        );
    }

    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<Object>> updateOrderStatus(
            @PathVariable UUID orderId,
            @Valid @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Order updated = orderStatusService.updateStatus(orderId, request, principal.id());
        Map<String, Object> data = new HashMap<>();
        data.put("orderId", updated.getId());
        data.put("status", updated.getStatus());
        data.put("lockExpiresAt", updated.getLockExpiresAt());
        data.put("processingStartedAt", updated.getProcessingStartedAt());
        return ResponseEntity.ok(ApiResponse.success(data,
            "Status updated to " + request.status()));
    }
}
