package com.printflow.orders.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "order_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties({"documents"})
    private Order order;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_size_kb")
    private Integer fileSizeKb;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(nullable = false)
    @Builder.Default
    private Integer copies = 1;

    @Column(name = "print_type", nullable = false, length = 10)
    @Builder.Default
    private String printType = "BW";

    @Column(name = "side_type", nullable = false, length = 10)
    @Builder.Default
    private String sideType = "SINGLE";

    @Column(name = "paper_size", nullable = false, length = 10)
    @Builder.Default
    private String paperSize = "A4";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String binding = "NONE";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String lamination = "NONE";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "copies_modified_at")
    private OffsetDateTime copiesModifiedAt;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
