package com.printflow.shops.service;

import com.printflow.shops.dto.SetClosureRequest;
import com.printflow.shops.dto.ShopResponse;
import com.printflow.shops.dto.UpdatePricesRequest;
import com.printflow.shops.entity.PriceConfig;
import com.printflow.shops.entity.Shop;
import com.printflow.shops.repository.PriceConfigRepository;
import com.printflow.shops.repository.ShopRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.printflow.shops.dto.CreateShopRequest;
import com.printflow.shops.dto.ShopPublicResponse;
import com.printflow.users.entity.User;
import com.printflow.users.repository.UserRepository;

@Service
public class ShopService {

    private final ShopRepository shopRepository;
    private final PriceConfigRepository priceConfigRepository;
    private final UserRepository userRepository;

    public ShopService(ShopRepository shopRepository, PriceConfigRepository priceConfigRepository, UserRepository userRepository) {
        this.shopRepository = shopRepository;
        this.priceConfigRepository = priceConfigRepository;
        this.userRepository = userRepository;
    }

    public Shop getDefaultShop() {
        return shopRepository.findAll().stream()
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("No shop found"));
    }

    public Shop getShopById(UUID shopId) {
        return shopRepository.findById(shopId)
            .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
    }

    public Shop getShopByOwnerId(UUID ownerId) {
        return shopRepository.findByOwnerId(ownerId)
            .orElseThrow(() -> new EntityNotFoundException("Shop not found for owner"));
    }

    public UUID getShopIdByOwnerId(UUID ownerId) {
        return shopRepository.findByOwnerId(ownerId)
            .map(Shop::getId)
            .orElse(null);
    }

    public PriceConfig getPriceConfig(UUID shopId) {
        return priceConfigRepository.findByShopId(shopId)
            .orElseThrow(() -> new EntityNotFoundException("Price config not found"));
    }

    public boolean isShopOpen(UUID shopId) {
        Shop shop = getShopById(shopId);
        return Boolean.TRUE.equals(shop.getIsOpen());
    }

    @Transactional
    public PriceConfig updatePrices(UUID shopId, UpdatePricesRequest req) {
        PriceConfig config = getPriceConfig(shopId);
        if (req.bwPerPageA4() != null) config.setBwPerPageA4(req.bwPerPageA4());
        if (req.colorPerPageA4() != null) config.setColorPerPageA4(req.colorPerPageA4());
        if (req.a3Multiplier() != null) config.setA3Multiplier(req.a3Multiplier());
        if (req.doubleSideDiscount() != null) config.setDoubleSideDiscount(req.doubleSideDiscount());
        if (req.spiralBindingFlat() != null) config.setSpiralBindingFlat(req.spiralBindingFlat());
        if (req.stapleFlat() != null) config.setStapleFlat(req.stapleFlat());
        if (req.laminationPerPage() != null) config.setLaminationPerPage(req.laminationPerPage());
        if (req.urgencyHighFee() != null) config.setUrgencyHighFee(req.urgencyHighFee());
        if (req.urgencyCriticalFee() != null) config.setUrgencyCriticalFee(req.urgencyCriticalFee());
        config.setUpdatedAt(OffsetDateTime.now());
        return priceConfigRepository.save(config);
    }

    @Transactional
    public Shop setClosureMode(UUID ownerId, SetClosureRequest req) {
        Shop shop = getShopByOwnerId(ownerId);
        if ("OPEN".equals(req.mode())) {
            shop.setIsOpen(true);
            shop.setClosureMode(null);
            shop.setClosureMsg(null);
            shop.setClosureUntil(null);
        } else {
            shop.setIsOpen(false);
            shop.setClosureMode(req.mode());
            shop.setClosureMsg(req.message());
            shop.setClosureUntil(req.until());
        }
        return shopRepository.save(shop);
    }

    @Transactional
    public Shop updateSettings(UUID shopId, Integer lockTimerMins, Integer copyModifyWindowMins, String upiId, String qrCodeUrl) {
        Shop shop = getShopById(shopId);
        if (lockTimerMins != null) {
            if (lockTimerMins < 2 || lockTimerMins > 30) {
                throw new IllegalArgumentException("Lock timer must be between 2 and 30 minutes");
            }
            shop.setLockTimerMins(lockTimerMins);
        }
        if (copyModifyWindowMins != null) {
            if (copyModifyWindowMins < 1 || copyModifyWindowMins > 30) {
                throw new IllegalArgumentException("Copy modification window must be between 1 and 30 minutes");
            }
            shop.setCopyModifyWindowMins(copyModifyWindowMins);
        }
        if (upiId != null) shop.setUpiId(upiId);
        if (qrCodeUrl != null) shop.setQrCodeUrl(qrCodeUrl);
        return shopRepository.save(shop);
    }

    public ShopResponse toResponse(Shop shop) {
        return new ShopResponse(
            shop.getId(),
            shop.getName(),
            shop.getAddress(),
            shop.getPhone(),
            shop.getWhatsapp(),
            shop.getIsOpen(),
            shop.getClosureMode(),
            shop.getClosureMsg(),
            shop.getClosureUntil(),
            shop.getLockTimerMins(),
            shop.getCopyModifyWindowMins(),
            shop.getUpiId(),
            shop.getQrCodeUrl()
        );
    }

    @Transactional
    public Shop createShop(UUID ownerId, CreateShopRequest req) {
        if (shopRepository.findByOwnerId(ownerId).isPresent()) {
            throw new IllegalStateException("Owner already has a shop");
        }
        
        User user = userRepository.findById(ownerId).orElseThrow(() -> new EntityNotFoundException("Owner not found"));
        user.setName(req.ownerName());
        userRepository.save(user);

        Shop shop = Shop.builder()
            .ownerId(ownerId)
            .name(req.name())
            .address(req.address())
            .phone(req.phone())
            .whatsapp(req.whatsapp())
            .upiId(req.upiId())
            .build();
        Shop savedShop = shopRepository.save(shop);

        PriceConfig config = PriceConfig.builder()
            .shopId(savedShop.getId())
            .build();
        priceConfigRepository.save(config);

        return savedShop;
    }

    public java.util.List<ShopPublicResponse> getAllShopsPublic() {
        return shopRepository.findAll().stream().map(shop -> {
            User user = userRepository.findById(shop.getOwnerId()).orElse(null);
            PriceConfig config = priceConfigRepository.findByShopId(shop.getId()).orElse(null);
            return new ShopPublicResponse(
                shop.getId(),
                shop.getName(),
                user != null ? user.getName() : "Unknown",
                shop.getAddress(),
                shop.getPhone(),
                shop.getWhatsapp(),
                shop.getUpiId(),
                shop.getQrCodeUrl(),
                shop.getIsOpen(),
                shop.getClosureMsg(),
                config
            );
        }).toList();
    }
}
