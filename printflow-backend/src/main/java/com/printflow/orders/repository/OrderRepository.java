package com.printflow.orders.repository;

import com.printflow.orders.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByIdAndCustomerId(UUID id, UUID customerId);

    @Query("SELECT o FROM Order o WHERE o.id = :id AND o.shopId IN " +
           "(SELECT s.id FROM Shop s WHERE s.ownerId = :ownerId)")
    Optional<Order> findByIdAndShopOwnerId(@Param("id") UUID id, @Param("ownerId") UUID ownerId);

    Page<Order> findAllByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.shopId = :shopId " +
           "AND o.status IN :statuses " +
           "ORDER BY " +
           "CASE o.urgency " +
           "  WHEN 'CRITICAL' THEN 1 " +
           "  WHEN 'HIGH' THEN 2 " +
           "  WHEN 'NORMAL' THEN 3 " +
           "END ASC, " +
           "o.expectedDelivery ASC NULLS LAST, " +
           "o.createdAt ASC")
    List<Order> findQueueOrders(@Param("shopId") UUID shopId,
                                @Param("statuses") List<String> statuses);

    long countByShopIdAndStatus(UUID shopId, String status);

    long countByShopIdAndStatusAndUrgencyIn(UUID shopId, String status, List<String> urgencies);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.shopId = :shopId AND o.status = 'COMPLETED' " +
           "AND o.updatedAt >= :since")
    double revenueSince(@Param("shopId") UUID shopId, @Param("since") java.time.OffsetDateTime since);

    @Query("SELECT COUNT(o) FROM Order o " +
           "WHERE o.shopId = :shopId AND o.status = 'COMPLETED' " +
           "AND o.updatedAt >= :since")
    long countCompletedSince(@Param("shopId") UUID shopId, @Param("since") java.time.OffsetDateTime since);
}
