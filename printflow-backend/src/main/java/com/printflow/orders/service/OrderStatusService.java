package com.printflow.orders.service;

import com.printflow.orders.dto.UpdateStatusRequest;
import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderStatusHistory;
import com.printflow.orders.enums.OrderStatus;
import com.printflow.orders.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OrderStatusService {

    private final OrderRepository orderRepository;
    private final OrderStatusTransitions transitions;
    private final OrderService orderService;

    public OrderStatusService(OrderRepository orderRepository,
                              OrderStatusTransitions transitions,
                              OrderService orderService) {
        this.orderRepository = orderRepository;
        this.transitions = transitions;
        this.orderService = orderService;
    }

    @Transactional
    public Order updateStatus(UUID orderId, UpdateStatusRequest request, UUID ownerId) {
        Order order = orderService.getOrderForOwner(orderId, ownerId);
        OrderStatus fromStatus = OrderStatus.valueOf(order.getStatus());
        OrderStatus toStatus = OrderStatus.valueOf(request.status());

        transitions.validate(fromStatus, toStatus);

        order.setStatus(request.status());

        if (toStatus == OrderStatus.ACCEPTED) {
            int lockMins = orderService.getOrderById(orderId).getLockExpiresAt() != null ? 0 :
                java.util.Optional.ofNullable(
                    java.util.Optional.ofNullable(
                        orderRepository.findById(orderId)
                    ).get().get()
                ).map(o -> 5).orElse(5);
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

        OrderStatusHistory history = OrderStatusHistory.builder()
            .orderId(orderId)
            .fromStatus(fromStatus.name())
            .toStatus(toStatus.name())
            .changedBy(ownerId)
            .note(request.note())
            .build();

        order.getDocuments().size();

        return orderRepository.save(order);
    }
}
