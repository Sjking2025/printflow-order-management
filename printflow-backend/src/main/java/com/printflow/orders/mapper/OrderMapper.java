package com.printflow.orders.mapper;

import com.printflow.orders.dto.OrderResponse;
import com.printflow.orders.dto.OrderSummaryResponse;
import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderDocument;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class OrderMapper {

    public OrderSummaryResponse toSummary(Order order) {
        return new OrderSummaryResponse(
            order.getId(),
            order.getOrderNumber(),
            order.getStatus(),
            order.getUrgency(),
            order.getDocuments() != null ? order.getDocuments().size() : 0,
            order.getTotalAmount(),
            order.getPaymentStatus(),
            order.getExpectedDelivery(),
            order.getCreatedAt()
        );
    }

    public List<OrderSummaryResponse> toSummaryList(List<Order> orders) {
        if (orders == null) return Collections.emptyList();
        return orders.stream().map(this::toSummary).collect(Collectors.toList());
    }
}
