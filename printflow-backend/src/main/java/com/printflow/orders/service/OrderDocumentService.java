package com.printflow.orders.service;

import com.printflow.orders.entity.Order;
import com.printflow.orders.entity.OrderDocument;
import com.printflow.orders.exception.CopyModificationException;
import com.printflow.orders.repository.OrderDocumentRepository;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.shops.entity.PriceConfig;
import com.printflow.shops.service.ShopService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

        if (!"PENDING".equals(order.getStatus())) {
            throw new CopyModificationException(CopyModificationException.ErrorCode.NOT_PENDING,
                "Order has already been accepted or processed. Modification is not allowed.");
        }

        if (order.getCopyModifyExpiresAt() != null
            && OffsetDateTime.now().isAfter(order.getCopyModifyExpiresAt())) {
            throw new CopyModificationException(CopyModificationException.ErrorCode.WINDOW_EXPIRED,
                "Modification window has expired.");
        }

        if (doc.getCopiesModifiedAt() != null) {
            throw new CopyModificationException(CopyModificationException.ErrorCode.ALREADY_MODIFIED,
                "This document has already been modified once.");
        }

        if (newCopies <= doc.getCopies()) {
            throw new CopyModificationException(CopyModificationException.ErrorCode.INCREASE_ONLY,
                "Cannot decrease copies. Only increase is allowed.");
        }

        doc.setCopies(newCopies);
        doc.setCopiesModifiedAt(OffsetDateTime.now());

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
