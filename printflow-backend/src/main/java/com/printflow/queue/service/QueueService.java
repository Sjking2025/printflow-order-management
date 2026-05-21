package com.printflow.queue.service;

import com.printflow.orders.entity.Order;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.shops.service.ShopService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class QueueService {

    private final OrderRepository orderRepository;
    private final ShopService shopService;

    public QueueService(OrderRepository orderRepository, ShopService shopService) {
        this.orderRepository = orderRepository;
        this.shopService = shopService;
    }

    public List<Order> getPriorityQueue(UUID ownerId, List<String> statuses) {
        UUID shopId = shopService.getShopIdByOwnerId(ownerId);
        if (shopId == null) {
            throw new IllegalStateException("Owner has no shop");
        }
        return orderRepository.findQueueOrders(shopId, statuses);
    }

    public record DashboardStats(
        long pendingOrders,
        long urgentOrders,
        long inProgressOrders,
        long completedToday,
        double revenueToday,
        long delayedOrders
    ) {}

    public DashboardStats getDashboardStats(UUID ownerId) {
        UUID shopId = shopService.getShopIdByOwnerId(ownerId);

        long pending = orderRepository.countByShopIdAndStatus(shopId, "PENDING");
        long urgent = orderRepository.countByShopIdAndStatusAndUrgencyIn(
            shopId, "PENDING", List.of("HIGH", "CRITICAL"));
        long inProgress = orderRepository.countByShopIdAndStatus(shopId, "IN_PROGRESS");
        long delayed = orderRepository.countByShopIdAndStatus(shopId, "DELAYED");

        double revenue = orderRepository.revenueSince(shopId,
            java.time.OffsetDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0));

        java.time.OffsetDateTime startOfDay =
            java.time.OffsetDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        long completedToday = orderRepository.countCompletedSince(shopId, startOfDay);

        return new DashboardStats(pending, urgent, inProgress, completedToday, revenue, delayed);
    }
}
