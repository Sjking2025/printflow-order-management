package com.printflow.shops.repository;

import com.printflow.shops.entity.PriceConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PriceConfigRepository extends JpaRepository<PriceConfig, UUID> {
    Optional<PriceConfig> findByShopId(UUID shopId);
}
