package com.printflow.orders.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.dto.PageResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.orders.dto.*;
import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderDocument;
import com.printflow.orders.exception.CopyModificationException;
import com.printflow.orders.mapper.OrderMapper;
import com.printflow.orders.service.OrderDocumentService;
import com.printflow.orders.service.OrderService;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.repository.PaymentRepository;
import com.printflow.users.repository.UserRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderDocumentService documentService;
    private final OrderMapper orderMapper;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    public OrderController(OrderService orderService,
                           OrderDocumentService documentService,
                           OrderMapper orderMapper,
                           PaymentRepository paymentRepository,
                           UserRepository userRepository) {
        this.orderService = orderService;
        this.documentService = documentService;
        this.orderMapper = orderMapper;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (!"CUSTOMER".equals(principal.role())) {
            return ResponseEntity.status(403).build();
        }
        Order order = orderService.createOrder(request, principal.id());
        Map<String, Object> data = new HashMap<>();
        data.put("orderId", order.getId());
        data.put("orderNumber", order.getOrderNumber());
        data.put("status", order.getStatus());
        data.put("totalAmount", order.getTotalAmount());
        data.put("lockExpiresAt", order.getLockExpiresAt());
        data.put("createdAt", order.getCreatedAt());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(data, "Order placed successfully. Please upload payment proof."));
    }

    @GetMapping
    @Transactional
    public ResponseEntity<ApiResponse<PageResponse<OrderSummaryResponse>>> getOrders(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        Page<Order> orders = orderService.getOrdersForCustomer(
            principal.id(), PageRequest.of(page - 1, pageSize));
        List<OrderSummaryResponse> summaries = orderMapper.toSummaryList(orders.getContent());
        Page<OrderSummaryResponse> mapped = new PageImpl<>(summaries, orders.getPageable(), orders.getTotalElements());
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(mapped)));
    }

    @GetMapping("/{orderId}")
    @Transactional
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Order order = orderService.getOrderForCustomer(orderId, principal.id());
        OrderResponse response = buildOrderResponse(order);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{orderId}/documents/{documentId}")
    public ResponseEntity<?> updateCopies(
            @PathVariable UUID orderId,
            @PathVariable UUID documentId,
            @Valid @RequestBody UpdateCopiesRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (!"CUSTOMER".equals(principal.role())) {
            return ResponseEntity.status(403).build();
        }
        try {
            OrderDocument doc = documentService.updateCopies(documentId, request.copies(), principal.id());
            Order order = doc.getOrder();
            Map<String, Object> data = new HashMap<>();
            data.put("documentId", doc.getId());
            data.put("copies", doc.getCopies());
            data.put("newSubtotal", doc.getSubtotal());
            data.put("newOrderTotal", order.getTotalAmount());
            data.put("copiesModifiedAt", doc.getCopiesModifiedAt());
            return ResponseEntity.ok(ApiResponse.success(data));
        } catch (CopyModificationException e) {
            Map<String, Object> errorBody = new HashMap<>();
            Map<String, Object> errorDetail = new HashMap<>();
            errorDetail.put("code", e.getErrorCode().name());
            errorDetail.put("message", e.getMessage());
            errorDetail.put("field", "copies");
            errorBody.put("success", false);
            errorBody.put("error", errorDetail);
            return ResponseEntity.status(409).body(errorBody);
        }
    }

    private OrderResponse buildOrderResponse(Order order) {
        OrderResponse.OrderCustomerInfo customer = order.getCustomerId() != null
            ? userRepository.findById(order.getCustomerId())
                .map(u -> new OrderResponse.OrderCustomerInfo(u.getId(), u.getName(), u.getPhone()))
                .orElse(null)
            : null;

        List<OrderResponse.DocumentResponse> documents = null;
        if (order.getDocuments() != null) {
            documents = order.getDocuments().stream()
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
                p.getId(), p.getAmount(),
                p.getGateway() != null ? p.getGateway().name() : null,
                p.getStatus() != null ? p.getStatus().name() : null,
                p.getProofUrl(), p.getTransactionId(),
                p.getGatewayOrderId(), p.getGatewayPaymentId(),
                p.getPaidAt(), p.getVerifiedAt()
            );
        }

        return new OrderResponse(
            order.getId(), order.getOrderNumber(),
            order.getStatus(), order.getUrgency(),
            order.getExpectedDelivery(), order.getDescription(),
            order.getTotalAmount(), order.getPaymentStatus(),
            order.getLockExpiresAt(), order.getCopyModifyExpiresAt(),
            order.getProcessingStartedAt(),
            customer, documents, payment, null, null,
            order.getCreatedAt()
        );
    }
}
