package com.printflow.clarifications.service;

import com.printflow.clarifications.dto.ClarificationResponse;
import com.printflow.clarifications.dto.SendMessageRequest;
import com.printflow.clarifications.entity.ClarificationThread;
import com.printflow.clarifications.repository.ClarificationRepository;
import com.printflow.orders.entity.Order;
import com.printflow.orders.repository.OrderRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ClarificationService {

    private final ClarificationRepository clarificationRepository;
    private final OrderRepository orderRepository;

    public ClarificationService(ClarificationRepository clarificationRepository,
                                OrderRepository orderRepository) {
        this.clarificationRepository = clarificationRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public ClarificationThread sendMessage(UUID orderId, SendMessageRequest request,
                                           UUID senderId, String senderRole) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        if ("OWNER".equals(senderRole) && !"WAITING_CLARIFICATION".equals(order.getStatus())) {
            order.setStatus("WAITING_CLARIFICATION");
            orderRepository.save(order);
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
