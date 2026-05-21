package com.printflow.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
    String code,
    String message,
    String field
) {
    public ErrorResponse(String code, String message) {
        this(code, message, null);
    }
}

