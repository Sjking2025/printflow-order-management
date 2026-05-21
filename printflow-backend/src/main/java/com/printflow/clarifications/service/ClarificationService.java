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

    public ClarificationService(ClarificationRepository clarificationRepository,
                                OrderRepository orderRepository,
                                @Lazy OrderStatusService orderStatusService) {
        this.clarificationRepository = clarificationRepository;
        this.orderRepository = orderRepository;
        this.orderStatusService = orderStatusService;
    }

    @Transactional
    public ClarificationThread sendMessage(UUID orderId, SendMessageRequest request,
                                           UUID senderId, String senderRole) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));

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

        return clarificationRepository.save(message);
    }

    public List<ClarificationResponse> getThread(UUID orderId) {
        return clarificationRepository.findByOrderIdOrderByCreatedAtAsc(orderId)
            .stream()
            .map(c -> new ClarificationResponse(
                c.getId(), c.getSenderRole(), c.getMessage(),
                c.getIsRead(), c.getCreatedAt()))
            .collect(Collectors.toList());
    }
}
