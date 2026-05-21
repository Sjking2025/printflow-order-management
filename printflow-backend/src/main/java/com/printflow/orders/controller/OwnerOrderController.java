package com.printflow.orders.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.orders.dto.UpdateStatusRequest;
import com.printflow.orders.entity.Order;
import com.printflow.orders.service.OrderService;
import com.printflow.orders.service.OrderStatusService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class OwnerOrderController {

    private final OrderService orderService;
    private final OrderStatusService orderStatusService;

    public OwnerOrderController(OrderService orderService,
                                OrderStatusService orderStatusService) {
        this.orderService = orderService;
        this.orderStatusService = orderStatusService;
    }

    @GetMapping("/owner/orders/{orderId}")
    public ResponseEntity<ApiResponse<?>> getOwnerOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Order order = orderService.getOrderForOwner(orderId, principal.id());
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<Object>> updateOrderStatus(
            @PathVariable UUID orderId,
            @Valid @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Order updated = orderStatusService.updateStatus(orderId, request, principal.id());
        return ResponseEntity.ok(ApiResponse.success(
            java.util.Map.of("orderId", updated.getId(), "status", updated.getStatus(),
                "lockExpiresAt", updated.getLockExpiresAt(),
                "processingStartedAt", updated.getProcessingStartedAt()),
            "Status updated to " + request.status()));
    }
}
