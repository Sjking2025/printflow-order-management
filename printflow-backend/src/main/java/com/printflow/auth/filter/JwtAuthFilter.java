package com.printflow.auth.filter;

import com.printflow.auth.service.JwtService;
import com.printflow.common.security.UserPrincipal;
import com.printflow.shops.entity.Shop;
import com.printflow.shops.service.ShopService;
import com.printflow.users.entity.User;
import com.printflow.users.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;
    private final UserService userService;
    private final ShopService shopService;

    public JwtAuthFilter(JwtService jwtService, UserService userService, ShopService shopService) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.shopService = shopService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                UUID userId = jwtService.extractUserId(token);
                String role = jwtService.extractRole(token);
                Optional<User> userOpt = userService.findById(userId);

                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    UUID shopId = null;
                    if ("OWNER".equals(user.getRole())) {
                        shopId = shopService.getShopIdByOwnerId(user.getId());
                    }

                    UserPrincipal principal = UserPrincipal.from(user, shopId);
                    var auth = new org.springframework.security.authentication
                        .UsernamePasswordAuthenticationToken(
                            principal, null, principal.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception e) {
                log.debug("JWT authentication failed: {}", e.getMessage());
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
