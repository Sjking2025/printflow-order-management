package com.printflow.clarifications.controller;

import com.printflow.clarifications.dto.ClarificationResponse;
import com.printflow.clarifications.dto.SendMessageRequest;
import com.printflow.clarifications.entity.ClarificationThread;
import com.printflow.clarifications.service.ClarificationService;
import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders/{orderId}/clarifications")
public class ClarificationController {

    private final ClarificationService clarificationService;

    public ClarificationController(ClarificationService clarificationService) {
        this.clarificationService = clarificationService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ClarificationThread>> sendMessage(
            @PathVariable UUID orderId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ClarificationThread message = clarificationService.sendMessage(
            orderId, request, principal.id(), principal.role());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(message));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClarificationResponse>>> getThread(
            @PathVariable UUID orderId) {
        List<ClarificationResponse> thread = clarificationService.getThread(orderId);
        return ResponseEntity.ok(ApiResponse.success(thread));
    }
}
