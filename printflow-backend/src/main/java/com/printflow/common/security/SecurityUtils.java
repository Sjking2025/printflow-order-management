package com.printflow.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static UserPrincipal getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user found");
        }
        return (UserPrincipal) auth.getPrincipal();
    }

    public static UUID getCurrentUserId() {
        return getCurrentUser().id();
    }

    public static UUID getCurrentUserShopId() {
        return getCurrentUser().shopId();
    }

    public static boolean hasRole(String role) {
        return getCurrentUser().role().equals(role);
    }
}
