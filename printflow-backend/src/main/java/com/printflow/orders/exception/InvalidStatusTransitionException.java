package com.printflow.orders.exception;

import com.printflow.orders.enums.OrderStatus;

public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(OrderStatus from, OrderStatus to) {
        super(String.format("Cannot transition from %s to %s", from, to));
    }
}
