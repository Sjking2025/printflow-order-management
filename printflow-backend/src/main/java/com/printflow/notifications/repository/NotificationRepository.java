package com.printflow.notifications.repository;

import com.printflow.notifications.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUserIdAndChannelOrderByCreatedAtDesc(UUID userId, String channel, Pageable pageable);
    Page<Notification> findByUserIdAndChannelAndStatusOrderByCreatedAtDesc(UUID userId, String channel, String status, Pageable pageable);
    List<Notification> findByUserIdAndChannelAndStatus(UUID userId, String channel, String status);
    long countByUserIdAndStatusAndChannel(UUID userId, String status, String channel);
}
