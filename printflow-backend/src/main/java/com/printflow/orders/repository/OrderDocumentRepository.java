package com.printflow.orders.repository;

import com.printflow.orders.entity.OrderDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrderDocumentRepository extends JpaRepository<OrderDocument, UUID> {
}
