package com.printflow.orders.service;

import com.printflow.orders.dto.*;
import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderDocument;
import com.printflow.orders.entity.OrderStatusHistory;
import com.printflow.orders.repository.OrderDocumentRepository;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.shops.entity.PriceConfig;
import com.printflow.shops.entity.Shop;
import com.printflow.shops.service.ShopService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderDocumentRepository documentRepository;
    private final OrderNumberGenerator orderNumberGenerator;
    private final PriceCalculationService priceCalculationService;
    private final ShopService shopService;
    private final com.printflow.notifications.service.NotificationService notificationService;

    public OrderService(OrderRepository orderRepository,
                        OrderDocumentRepository documentRepository,
                        OrderNumberGenerator orderNumberGenerator,
                        PriceCalculationService priceCalculationService,
                        ShopService shopService,
                        com.printflow.notifications.service.NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.documentRepository = documentRepository;
        this.orderNumberGenerator = orderNumberGenerator;
        this.priceCalculationService = priceCalculationService;
        this.shopService = shopService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Order createOrder(CreateOrderRequest request, UUID customerId) {
        Shop shop = shopService.getShopById(request.shopId());
        if (!Boolean.TRUE.equals(shop.getIsOpen())) {
            throw new IllegalStateException("Shop is currently closed. Please try later.");
        }

        PriceConfig priceConfig = shopService.getPriceConfig(request.shopId());

        String orderNumber = orderNumberGenerator.generate();

        Order order = Order.builder()
            .shopId(request.shopId())
            .customerId(customerId)
            .orderNumber(orderNumber)
            .status("PENDING")
            .urgency(request.urgency())
            .expectedDelivery(request.expectedDelivery())
            .description(request.description())
            .totalAmount(BigDecimal.ZERO)
            .build();

        BigDecimal documentsTotal = BigDecimal.ZERO;
        int sortOrder = 0;

        for (DocumentRequest docReq : request.documents()) {
            PriceCalculationService.CalculatedDocumentPrice calc =
                priceCalculationService.calculateDocumentPrice(
                    docReq.printType(), docReq.paperSize(), docReq.sideType(),
                    docReq.binding(), docReq.lamination(),
                    docReq.copies(), docReq.pageCount(), priceConfig);

            OrderDocument doc = OrderDocument.builder()
                .order(order)
                .fileName(docReq.fileName())
                .fileUrl(docReq.fileUrl())
                .fileSizeKb(docReq.fileSizeKb())
                .pageCount(docReq.pageCount())
                .copies(docReq.copies())
                .printType(docReq.printType())
                .sideType(docReq.sideType())
                .paperSize(docReq.paperSize())
                .binding(docReq.binding())
                .lamination(docReq.lamination())
                .notes(docReq.notes())
                .unitPrice(calc.unitPrice())
                .subtotal(calc.subtotal())
                .sortOrder(sortOrder++)
                .build();

            order.getDocuments().add(doc);
            documentsTotal = documentsTotal.add(calc.subtotal());
        }

        BigDecimal urgencyFee = priceCalculationService.calculateUrgencyFee(
            request.urgency(), priceConfig);
        BigDecimal total = priceCalculationService.calculateOrderTotal(documentsTotal, urgencyFee);
        order.setTotalAmount(total);

        order = orderRepository.save(order);
        notificationService.notifyNewOrderToOwner(order);
        return order;
    }

    public Order getOrderForCustomer(UUID orderId, UUID customerId) {
        return orderRepository.findByIdAndCustomerId(orderId, customerId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));
    }

    public Order getOrderForOwner(UUID orderId, UUID ownerId) {
        return orderRepository.findByIdAndShopOwnerId(orderId, ownerId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));
    }

    public Page<Order> getOrdersForCustomer(UUID customerId, Pageable pageable) {
        return orderRepository.findAllByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    public Order getOrderById(UUID orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));
    }
}
