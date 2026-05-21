package com.printflow.orders.service;

import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderDocument;
import com.printflow.orders.exception.OrderLockExpiredException;
import com.printflow.orders.repository.OrderDocumentRepository;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.shops.entity.PriceConfig;
import com.printflow.shops.service.ShopService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OrderDocumentService {

    private final OrderDocumentRepository documentRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final ShopService shopService;
    private final PriceCalculationService priceCalculationService;

    public OrderDocumentService(OrderDocumentRepository documentRepository,
                                OrderRepository orderRepository,
                                OrderService orderService,
                                ShopService shopService,
                                PriceCalculationService priceCalculationService) {
        this.documentRepository = documentRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.shopService = shopService;
        this.priceCalculationService = priceCalculationService;
    }

    @Transactional
    public OrderDocument updateCopies(UUID documentId, int newCopies, UUID customerId) {
        if (newCopies < 1) {
            throw new IllegalArgumentException("Copies must be at least 1");
        }

        OrderDocument doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new EntityNotFoundException("Document not found"));

        Order order = doc.getOrder();
        if (!order.getCustomerId().equals(customerId)) {
            throw new EntityNotFoundException("Document not found");
        }

        boolean isDecreasing = newCopies < doc.getCopies();

        if (isDecreasing) {
            boolean lockActive = order.getLockExpiresAt() != null
                && Instant.now().isBefore(order.getLockExpiresAt().toInstant());
            boolean processingStarted = order.getProcessingStartedAt() != null;

            if (processingStarted && !lockActive) {
                throw new OrderLockExpiredException(
                    "Cannot decrease copies after printing has started");
            }
        }

        doc.setCopies(newCopies);

        PriceConfig priceConfig = shopService.getPriceConfig(order.getShopId());
        PriceCalculationService.CalculatedDocumentPrice calc =
            priceCalculationService.calculateDocumentPrice(
                doc.getPrintType(), doc.getPaperSize(), doc.getSideType(),
                doc.getBinding(), doc.getLamination(),
                newCopies, doc.getPageCount(), priceConfig);

        doc.setSubtotal(calc.subtotal());

        BigDecimal documentsTotal = BigDecimal.ZERO;
        for (OrderDocument d : order.getDocuments()) {
            if (d.getId().equals(documentId)) {
                documentsTotal = documentsTotal.add(calc.subtotal());
            } else {
                documentsTotal = documentsTotal.add(d.getSubtotal() != null ? d.getSubtotal() : BigDecimal.ZERO);
            }
        }

        BigDecimal urgencyFee = priceCalculationService.calculateUrgencyFee(
            order.getUrgency(), priceConfig);
        BigDecimal newTotal = priceCalculationService.calculateOrderTotal(documentsTotal, urgencyFee);
        order.setTotalAmount(newTotal);

        documentRepository.save(doc);
        orderRepository.save(order);

        return doc;
    }
}
