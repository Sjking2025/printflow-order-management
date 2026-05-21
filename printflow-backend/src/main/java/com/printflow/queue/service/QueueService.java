package com.printflow.queue.service;

import com.printflow.orders.dto.ShopCustomerStats;
import com.printflow.orders.entity.Order;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.shops.service.ShopService;
import com.printflow.users.entity.User;
import com.printflow.users.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class QueueService {

    private final OrderRepository orderRepository;
    private final ShopService shopService;
    private final UserRepository userRepository;

    public QueueService(OrderRepository orderRepository, ShopService shopService, UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.shopService = shopService;
        this.userRepository = userRepository;
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

    public List<ShopCustomerStats> getShopCustomerStats(UUID ownerId) {
        UUID shopId = shopService.getShopIdByOwnerId(ownerId);
        if (shopId == null) {
            throw new IllegalStateException("Owner has no shop");
        }

        List<Object[]> raw = orderRepository.findCustomerOrderStats(shopId);

        Map<UUID, User> users = userRepository.findAllById(
            raw.stream().map(r -> (UUID) r[0]).collect(Collectors.toList())
        ).stream().collect(Collectors.toMap(User::getId, u -> u));

        return raw.stream().map(r -> {
            UUID customerId = (UUID) r[0];
            long count = (long) r[1];
            java.time.OffsetDateTime latest = (java.time.OffsetDateTime) r[2];
            User user = users.get(customerId);
            return new ShopCustomerStats(
                customerId,
                user != null ? user.getName() : "Unknown",
                user != null ? user.getEmail() : null,
                count,
                latest
            );
        }).sorted(Comparator.comparingLong(ShopCustomerStats::orderCount).reversed())
         .collect(Collectors.toList());
    }

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
