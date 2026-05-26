package com.printflow.auth.filter;

import com.printflow.auth.service.JwtService;
import com.printflow.common.security.UserPrincipal;
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

/**
 * JWT authentication filter.
 *
 * Optimization: shopId is read directly from the JWT claims (embedded at login time)
 * rather than issuing a second DB query per authenticated request. This eliminates the
 * previously redundant call to ShopService.getShopIdByOwnerId() on every API call.
 *
 * One DB query per request remains (User lookup) for isActive / role verification.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;
    private final UserService userService;

    public JwtAuthFilter(JwtService jwtService, UserService userService) {
        this.jwtService = jwtService;
        this.userService = userService;
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
                // Read shopId from JWT claims — no DB round-trip needed
                UUID shopId = jwtService.extractShopId(token);

                Optional<User> userOpt = userService.findById(userId);

                if (userOpt.isPresent()) {
                    UserPrincipal principal = UserPrincipal.from(userOpt.get(), shopId);
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
