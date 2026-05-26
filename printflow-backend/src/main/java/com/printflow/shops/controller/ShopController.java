package com.printflow.shops.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.shops.dto.SetClosureRequest;
import com.printflow.shops.dto.ShopResponse;
import com.printflow.shops.dto.UpdatePricesRequest;
import com.printflow.shops.entity.PriceConfig;
import com.printflow.shops.entity.Shop;
import com.printflow.shops.service.ShopService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping("/shops/public")
    public ResponseEntity<ApiResponse<java.util.List<com.printflow.shops.dto.ShopPublicResponse>>> getAllShopsPublic() {
        return ResponseEntity.ok(ApiResponse.success(shopService.getAllShopsPublic()));
    }

    @GetMapping("/owner/shop")
    public ResponseEntity<ApiResponse<ShopResponse>> getOwnerShop(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            Shop shop = shopService.getShopByOwnerId(principal.id());
            return ResponseEntity.ok(ApiResponse.success(shopService.toResponse(shop)));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ApiResponse.error("No shop found for owner"));
        }
    }

    @PostMapping("/shops")
    public ResponseEntity<ApiResponse<ShopResponse>> createShop(
            @Valid @RequestBody com.printflow.shops.dto.CreateShopRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Shop shop = shopService.createShop(principal.id(), request);
        return ResponseEntity.ok(ApiResponse.success(shopService.toResponse(shop), "Shop created successfully"));
    }

    @GetMapping("/shops/{shopId}")
    public ResponseEntity<ApiResponse<ShopResponse>> getShop(@PathVariable UUID shopId) {
        Shop shop = shopService.getShopById(shopId);
        return ResponseEntity.ok(ApiResponse.success(shopService.toResponse(shop)));
    }

    @GetMapping("/shops/{shopId}/prices")
    public ResponseEntity<ApiResponse<PriceConfig>> getPriceConfig(@PathVariable UUID shopId) {
        PriceConfig config = shopService.getPriceConfig(shopId);
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    @PatchMapping("/shops/{shopId}/prices")
    public ResponseEntity<?> updatePrices(
            @PathVariable UUID shopId,
            @Valid @RequestBody UpdatePricesRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Shop shop = shopService.getShopById(shopId);
        if (!shop.getOwnerId().equals(principal.id())) {
            return ResponseEntity.status(403)
                .body(Map.of("success", false, "error",
                    Map.of("code", "FORBIDDEN", "message", "Not your shop")));
        }
        PriceConfig updated = shopService.updatePrices(shopId, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Prices updated successfully"));
    }

    @PatchMapping("/shops/{shopId}/settings")
    public ResponseEntity<ApiResponse<ShopResponse>> updateSettings(
            @PathVariable UUID shopId,
            @RequestBody Map<String, Object> settings,
            @AuthenticationPrincipal UserPrincipal principal) {
        Shop shop = shopService.getShopById(shopId);
        if (!shop.getOwnerId().equals(principal.id())) {
            return ResponseEntity.status(403).build();
        }
        Integer lockTimerMins = settings.get("lockTimerMins") != null
            ? Integer.valueOf(settings.get("lockTimerMins").toString()) : null;
        Integer copyModifyWindowMins = settings.get("copyModifyWindowMins") != null
            ? Integer.valueOf(settings.get("copyModifyWindowMins").toString()) : null;
        String upiId = (String) settings.get("upiId");
        String qrCodeUrl = (String) settings.get("qrCodeUrl");
        Shop updated = shopService.updateSettings(shopId, lockTimerMins, copyModifyWindowMins, upiId, qrCodeUrl);
        return ResponseEntity.ok(ApiResponse.success(shopService.toResponse(updated), "Settings updated"));
    }

    @PostMapping("/owner/closure")
    public ResponseEntity<ApiResponse<ShopResponse>> setClosure(
            @Valid @RequestBody SetClosureRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Shop updated = shopService.setClosureMode(principal.id(), request);
        return ResponseEntity.ok(ApiResponse.success(shopService.toResponse(updated),
            "Closure mode updated"));
    }
}
