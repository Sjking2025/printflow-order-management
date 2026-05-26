package com.printflow.orders.exception;

public class CopyModificationException extends RuntimeException {

    private final ErrorCode errorCode;

    public enum ErrorCode {
        INCREASE_ONLY,
        WINDOW_EXPIRED,
        ALREADY_MODIFIED,
        NOT_PENDING
    }

    public CopyModificationException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
