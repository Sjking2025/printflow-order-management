package com.printflow.orders.service;

import com.printflow.orders.dto.UpdateStatusRequest;
import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderStatusHistory;
import com.printflow.orders.enums.OrderStatus;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.orders.repository.OrderStatusHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OrderStatusService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;
    private final OrderStatusTransitions transitions;
    private final OrderService orderService;
    private final com.printflow.notifications.service.NotificationService notificationService;

    public OrderStatusService(OrderRepository orderRepository,
                              OrderStatusHistoryRepository historyRepository,
                              OrderStatusTransitions transitions,
                              OrderService orderService,
                              com.printflow.notifications.service.NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.historyRepository = historyRepository;
        this.transitions = transitions;
        this.orderService = orderService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Order updateStatus(UUID orderId, UpdateStatusRequest request, UUID actorId) {
        Order order = orderService.getOrderForOwner(orderId, actorId);
        OrderStatus fromStatus = OrderStatus.valueOf(order.getStatus());
        OrderStatus toStatus = OrderStatus.valueOf(request.status());

        transitions.validate(fromStatus, toStatus);

        order.setStatus(request.status());

        if (toStatus == OrderStatus.ACCEPTED) {
            order.setLockExpiresAt(OffsetDateTime.now().plusMinutes(5));
        }

        if (toStatus == OrderStatus.IN_PROGRESS) {
            order.setProcessingStartedAt(OffsetDateTime.now());
        }

        if (toStatus == OrderStatus.DELAYED) {
            order.setDelayReason(request.delayReason());
            order.setDelayUntil(request.delayUntil());
        }

        if (toStatus == OrderStatus.CANCELLED) {
            if (request.note() == null || request.note().isBlank()) {
                throw new IllegalArgumentException("Cancellation reason is required");
            }
            order.setCancelledReason(request.note());
        }

        // Persist the order first so the history entry references a saved order
        Order savedOrder = orderRepository.save(order);

        // Record transition in audit trail — was built but never saved before this fix
        OrderStatusHistory history = OrderStatusHistory.builder()
            .orderId(orderId)
            .fromStatus(fromStatus.name())
            .toStatus(toStatus.name())
            .changedBy(actorId)
            .note(request.note())
            .build();
        historyRepository.save(history);

        // Force-initialize documents collection within transaction to prevent lazy-load issues
        savedOrder.getDocuments().size();

        // Notify customer of status change
        notificationService.notifyOrderStatusChange(savedOrder, toStatus);

        return savedOrder;
    }
}
