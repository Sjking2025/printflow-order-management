package com.printflow.clarifications.service;

import com.printflow.clarifications.dto.ClarificationResponse;
import com.printflow.clarifications.dto.SendMessageRequest;
import com.printflow.clarifications.entity.ClarificationThread;
import com.printflow.clarifications.repository.ClarificationRepository;
import com.printflow.orders.dto.UpdateStatusRequest;
import com.printflow.orders.entity.Order;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.orders.service.OrderStatusService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ClarificationService {

    private final ClarificationRepository clarificationRepository;
    private final OrderRepository orderRepository;
    private final OrderStatusService orderStatusService;
    private final com.printflow.notifications.service.NotificationService notificationService;

    public ClarificationService(ClarificationRepository clarificationRepository,
                                OrderRepository orderRepository,
                                @Lazy OrderStatusService orderStatusService,
                                com.printflow.notifications.service.NotificationService notificationService) {
        this.clarificationRepository = clarificationRepository;
        this.orderRepository = orderRepository;
        this.orderStatusService = orderStatusService;
        this.notificationService = notificationService;
    }

    @Transactional
    public ClarificationThread sendMessage(UUID orderId, SendMessageRequest request,
                                           UUID senderId, String senderRole) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        if ("COMPLETED".equals(order.getStatus()) || "CANCELLED".equals(order.getStatus())) {
            throw new IllegalStateException("Cannot send messages on " + order.getStatus() + " orders");
        }

        // When an owner initiates a clarification, transition through the FSM properly
        // so that: (1) the transition is validated, (2) history is recorded.
        // Previously this was a direct setStatus() call bypassing both FSM and audit trail.
        if ("OWNER".equals(senderRole) && !"WAITING_CLARIFICATION".equals(order.getStatus())) {
            UpdateStatusRequest statusRequest = new UpdateStatusRequest(
                "WAITING_CLARIFICATION",
                "Owner initiated clarification",  // note
                null,                              // delayReason — not applicable
                null                               // delayUntil  — not applicable
            );
            orderStatusService.updateStatus(orderId, statusRequest, senderId);
        }

        ClarificationThread message = ClarificationThread.builder()
            .orderId(orderId)
            .senderId(senderId)
            .senderRole(senderRole)
            .message(request.message())
            .build();

        ClarificationThread savedMessage = clarificationRepository.save(message);

        if ("OWNER".equals(senderRole)) {
            notificationService.notifyClarificationRequested(order, request.message());
        } else if ("CUSTOMER".equals(senderRole)) {
            notificationService.notifyClarificationReplied(order, request.message());
        }

        return savedMessage;
    }

    @Transactional(readOnly = true)
    public List<ClarificationResponse> getThread(UUID orderId) {
        return clarificationRepository.findByOrderIdOrderByCreatedAtAsc(orderId)
            .stream()
            .map(c -> new ClarificationResponse(
                c.getId(), c.getSenderRole(), c.getMessage(),
                Boolean.TRUE.equals(c.getIsRead()), c.getCreatedAt()))
            .collect(Collectors.toList());
    }
}
