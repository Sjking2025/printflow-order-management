package com.printflow.notifications.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.dto.PageResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.notifications.entity.Notification;
import com.printflow.notifications.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Notification>>> getNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Boolean unreadOnly) {
        Page<Notification> notifications = notificationRepository
            .findByUserIdOrderByCreatedAtDesc(principal.id(), PageRequest.of(page - 1, pageSize));
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(notifications)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setStatus("READ");
        notificationRepository.save(notification);
        return ResponseEntity.ok(ApiResponse.success(
            Map.of("id", id, "isRead", true)));
    }
}
