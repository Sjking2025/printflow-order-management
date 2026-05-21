package com.printflow.orders.exception;

public class OrderLockExpiredException extends RuntimeException {
    public OrderLockExpiredException(String message) {
        super(message);
    }
}
