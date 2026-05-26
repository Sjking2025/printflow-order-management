package com.printflow.orders.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderResponse(
    UUID id,
    String orderNumber,
    String status,
    String urgency,
    OffsetDateTime expectedDelivery,
    String description,
    BigDecimal totalAmount,
    String paymentStatus,
    OffsetDateTime lockExpiresAt,
    OffsetDateTime copyModifyExpiresAt,
    OffsetDateTime processingStartedAt,
    OrderCustomerInfo customer,
    List<DocumentResponse> documents,
    PaymentInfo payment,
    List<StatusHistoryEntry> statusHistory,
    List<ClarificationEntry> clarifications,
    OffsetDateTime createdAt
) {
    public record OrderCustomerInfo(UUID id, String name, String phone) {}
    public record DocumentResponse(UUID id, String fileName, String fileUrl,
                                   Integer pageCount, int copies,
                                   String printType, String sideType,
                                   String paperSize, String binding,
                                   String lamination, String notes,
                                   BigDecimal subtotal,
                                   OffsetDateTime copiesModifiedAt) {}
    public record PaymentInfo(UUID id, BigDecimal amount, String method,
                              String status, String proofUrl,
                              String transactionId, OffsetDateTime verifiedAt) {}
    public record StatusHistoryEntry(String fromStatus, String toStatus,
                                     String changedBy, String note,
                                     OffsetDateTime createdAt) {}
    public record ClarificationEntry(UUID id, String senderRole,
                                     String message, boolean isRead,
                                     OffsetDateTime createdAt) {}
}
