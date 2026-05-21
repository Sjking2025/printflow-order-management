package com.printflow.orders;

import com.printflow.orders.enums.OrderStatus;
import com.printflow.orders.exception.InvalidStatusTransitionException;
import com.printflow.orders.service.OrderStatusTransitions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderStatusTransitionsTest {

    private final OrderStatusTransitions transitions = new OrderStatusTransitions();

    @Test
    void shouldAllowPendingToAccepted() {
        assertDoesNotThrow(() -> transitions.validate(OrderStatus.PENDING, OrderStatus.ACCEPTED));
    }

    @Test
    void shouldAllowPendingToCancelled() {
        assertDoesNotThrow(() -> transitions.validate(OrderStatus.PENDING, OrderStatus.CANCELLED));
    }

    @Test
    void shouldNotAllowPendingToCompleted() {
        assertThrows(InvalidStatusTransitionException.class,
            () -> transitions.validate(OrderStatus.PENDING, OrderStatus.COMPLETED));
    }

    @Test
    void shouldNotAllowCompletedToInProgress() {
        assertThrows(InvalidStatusTransitionException.class,
            () -> transitions.validate(OrderStatus.COMPLETED, OrderStatus.IN_PROGRESS));
    }

    @Test
    void shouldAllowAcceptedToInProgress() {
        assertDoesNotThrow(() -> transitions.validate(OrderStatus.ACCEPTED, OrderStatus.IN_PROGRESS));
    }

    @Test
    void shouldAllowInProgressToCompleted() {
        assertDoesNotThrow(() -> transitions.validate(OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED));
    }

    @Test
    void shouldAllowAcceptedToDelayed() {
        assertDoesNotThrow(() -> transitions.validate(OrderStatus.ACCEPTED, OrderStatus.DELAYED));
    }

    @Test
    void shouldAllowDelayedToInProgress() {
        assertDoesNotThrow(() -> transitions.validate(OrderStatus.DELAYED, OrderStatus.IN_PROGRESS));
    }
}
