package com.printflow.orders.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.dto.PageResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.orders.dto.*;
import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderDocument;
import com.printflow.orders.mapper.OrderMapper;
import com.printflow.orders.service.OrderDocumentService;
import com.printflow.orders.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderDocumentService documentService;
    private final OrderMapper orderMapper;

    public OrderController(OrderService orderService,
                           OrderDocumentService documentService,
                           OrderMapper orderMapper) {
        this.orderService = orderService;
        this.documentService = documentService;
        this.orderMapper = orderMapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (!"CUSTOMER".equals(principal.role())) {
            return ResponseEntity.status(403).build();
        }
        Order order = orderService.createOrder(request, principal.id());
        Map<String, Object> data = Map.of(
            "orderId", order.getId(),
            "orderNumber", order.getOrderNumber(),
            "status", order.getStatus(),
            "totalAmount", order.getTotalAmount(),
            "lockExpiresAt", order.getLockExpiresAt(),
            "createdAt", order.getCreatedAt()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(data, "Order placed successfully. Please upload payment proof."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderSummaryResponse>>> getOrders(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        Page<Order> orders = orderService.getOrdersForCustomer(
            principal.id(), PageRequest.of(page - 1, pageSize));
        Page<OrderSummaryResponse> mapped = orders.map(orderMapper::toSummary);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(mapped)));
    }

    @GetMapping("/{orderId}")
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
            Map<String, Object> data = Map.of(
                "documentId", doc.getId(),
                "copies", doc.getCopies(),
                "newSubtotal", doc.getSubtotal(),
                "newOrderTotal", order.getTotalAmount()
            );
            return ResponseEntity.ok(ApiResponse.success(data));
        } catch (Exception e) {
            if (e.getMessage().contains("Cannot decrease")) {
                return ResponseEntity.status(409)
                    .body(Map.of("success", false, "error",
                        Map.of("code", "ORDER_LOCK_EXPIRED", "message", e.getMessage(), "field", "copies")));
            }
            throw e;
        }
    }

    private OrderResponse buildOrderResponse(Order order) {
        return new OrderResponse(
            order.getId(),
            order.getOrderNumber(),
            order.getStatus(),
            order.getUrgency(),
            order.getExpectedDelivery(),
            order.getDescription(),
            order.getTotalAmount(),
            order.getPaymentStatus(),
            order.getLockExpiresAt(),
            order.getProcessingStartedAt(),
            null, null, null, null, null,
            order.getCreatedAt()
        );
    }
}
