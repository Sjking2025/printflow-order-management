package com.printflow.auth.service;

import com.printflow.users.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long accessExpiry;
    private final long refreshExpiry;

    public JwtService(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.access-expiry}") long accessExpiry,
        @Value("${app.jwt.refresh-expiry}") long refreshExpiry
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiry = accessExpiry;
        this.refreshExpiry = refreshExpiry;
    }

    public long getRefreshExpirySeconds() {
        return refreshExpiry;
    }

    public String generateAccessToken(User user, UUID shopId) {
        Date now = new Date();
        return Jwts.builder()
            .subject(user.getId().toString())
            .claim("email", user.getEmail())
            .claim("role", user.getRole())
            .claim("shopId", shopId != null ? shopId.toString() : null)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + accessExpiry * 1000))
            .signWith(secretKey)
            .compact();
    }

    /** Generates a cryptographically random raw refresh token (UUID v4). */
    public String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }

    /**
     * SHA-256 hex digest of the raw token.
     * Always hash before storing or comparing — never persist the raw value.
     */
    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public Claims validateToken(String token) {
        try {
            return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (JwtException e) {
            throw new IllegalArgumentException("Invalid or expired token");
        }
    }

    public UUID extractUserId(String token) {
        String sub = validateToken(token).getSubject();
        return UUID.fromString(sub);
    }

    public String extractRole(String token) {
        return validateToken(token).get("role", String.class);
    }

    /**
     * Extracts shopId from JWT claims.
     * Returns null for CUSTOMER tokens (shopId claim is null).
     * Used by JwtAuthFilter to avoid a DB round-trip per request.
     */
    public UUID extractShopId(String token) {
        String shopIdStr = validateToken(token).get("shopId", String.class);
        return shopIdStr != null ? UUID.fromString(shopIdStr) : null;
    }
}
