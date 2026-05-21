package com.printflow.orders.mapper;

import com.printflow.orders.dto.OrderResponse;
import com.printflow.orders.dto.OrderSummaryResponse;
import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderDocument;
import com.printflow.users.entity.User;
import com.printflow.users.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class OrderMapper {

    private final UserRepository userRepository;

    public OrderMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public OrderSummaryResponse toSummary(Order order) {
        throw new UnsupportedOperationException("Use toSummaryList with batch lookup");
    }

    public List<OrderSummaryResponse> toSummaryList(List<Order> orders) {
        if (orders == null) return Collections.emptyList();

        List<UUID> customerIds = orders.stream()
            .map(Order::getCustomerId)
            .distinct()
            .collect(Collectors.toList());

        Map<UUID, String> customerNames = userRepository.findAllById(customerIds)
            .stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        return orders.stream().map(order -> new OrderSummaryResponse(
            order.getId(),
            order.getOrderNumber(),
            order.getStatus(),
            order.getUrgency(),
            order.getDocuments() != null ? order.getDocuments().size() : 0,
            order.getTotalAmount(),
            order.getPaymentStatus(),
            order.getExpectedDelivery(),
            order.getCreatedAt(),
            order.getCustomerId(),
            customerNames.get(order.getCustomerId())
        )).collect(Collectors.toList());
    }
}
