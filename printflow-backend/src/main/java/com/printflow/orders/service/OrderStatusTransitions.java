package com.printflow.orders.service;

import com.printflow.orders.enums.OrderStatus;
import com.printflow.orders.exception.InvalidStatusTransitionException;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
public class OrderStatusTransitions {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
        OrderStatus.PENDING,                Set.of(OrderStatus.ACCEPTED, OrderStatus.CANCELLED),
        OrderStatus.ACCEPTED,               Set.of(OrderStatus.IN_PROGRESS, OrderStatus.WAITING_CLARIFICATION, OrderStatus.DELAYED, OrderStatus.CANCELLED),
        OrderStatus.IN_PROGRESS,            Set.of(OrderStatus.COMPLETED, OrderStatus.DELAYED, OrderStatus.CANCELLED),
        OrderStatus.WAITING_CLARIFICATION,  Set.of(OrderStatus.ACCEPTED, OrderStatus.CANCELLED),
        OrderStatus.DELAYED,                Set.of(OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED),
        OrderStatus.COMPLETED,              Set.of(),
        OrderStatus.CANCELLED,              Set.of()
    );

    public void validate(OrderStatus from, OrderStatus to) {
        if (!ALLOWED.getOrDefault(from, Set.of()).contains(to)) {
            throw new InvalidStatusTransitionException(from, to);
        }
    }

    public boolean isValid(OrderStatus from, OrderStatus to) {
        return ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }
}
