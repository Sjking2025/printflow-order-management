package com.printflow.clarifications.repository;

import com.printflow.clarifications.entity.ClarificationThread;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClarificationRepository extends JpaRepository<ClarificationThread, UUID> {
    List<ClarificationThread> findByOrderIdOrderByCreatedAtAsc(UUID orderId);
}
