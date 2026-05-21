package com.printflow.queue.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.orders.dto.OrderSummaryResponse;
import com.printflow.orders.entity.Order;
import com.printflow.orders.mapper.OrderMapper;
import com.printflow.queue.service.QueueService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/owner")
public class QueueController {

    private final QueueService queueService;
    private final OrderMapper orderMapper;

    public QueueController(QueueService queueService, OrderMapper orderMapper) {
        this.queueService = queueService;
        this.orderMapper = orderMapper;
    }

    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<OrderSummaryResponse>>> getQueue(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "PENDING,ACCEPTED,IN_PROGRESS,DELAYED,WAITING_CLARIFICATION")
            String status) {
        List<String> statuses = List.of(status.split(","));
        List<Order> orders = queueService.getPriorityQueue(principal.id(), statuses);
        return ResponseEntity.ok(ApiResponse.success(orderMapper.toSummaryList(orders)));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<QueueService.DashboardStats>> getDashboard(
            @AuthenticationPrincipal UserPrincipal principal) {
        QueueService.DashboardStats stats = queueService.getDashboardStats(principal.id());
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
