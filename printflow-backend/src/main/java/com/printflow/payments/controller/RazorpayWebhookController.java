package com.printflow.payments.controller;

import com.printflow.payments.exception.InvalidPaymentSignatureException;
import com.printflow.payments.service.RazorpayService;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public webhook endpoint for Razorpay payment events.
 *
 * Security: NOT JWT-protected (Razorpay cannot send JWTs).
 * Secured instead via HMAC-SHA256 signature verification on every request.
 * The X-Razorpay-Signature header is verified against the raw request body.
 *
 * Supported events:
 *   payment.captured → auto-accept order (idempotent with client-side verify)
 *   payment.failed   → mark payment failed
 *
 * IMPORTANT: Always returns 200 OK to Razorpay, even for errors.
 * Returning 4xx/5xx causes Razorpay to retry the webhook, which we don't want
 * for signature mismatches or unknown events.
 */
@RestController
@RequestMapping("/api/v1/payments/webhook")
public class RazorpayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayWebhookController.class);

    private final RazorpayService razorpayService;

    @Value("${app.razorpay.webhook-secret}")
    private String webhookSecret;

    public RazorpayWebhookController(RazorpayService razorpayService) {
        this.razorpayService = razorpayService;
    }

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader("X-Razorpay-Signature") String signature) {

        log.debug("Webhook received from Razorpay. Signature present: {}", signature != null);

        // 1. Verify signature FIRST — reject forged/tampered requests immediately
        try {
            verifySignature(rawBody, signature);
        } catch (InvalidPaymentSignatureException e) {
            log.warn("Webhook signature verification failed — rejecting event.");
            // Return 200 to prevent Razorpay retries on forged requests
            // (Retrying won't fix a signature mismatch caused by a wrong secret or tampering)
            return ResponseEntity.ok("signature_mismatch");
        }

        // 2. Parse payload JSON
        JSONObject payload;
        try {
            payload = new JSONObject(rawBody);
        } catch (Exception e) {
            log.error("Invalid webhook payload JSON: {}", e.getMessage());
            return ResponseEntity.ok("invalid_payload");
        }

        // 3. Extract event type
        String eventType = payload.optString("event", "unknown");
        log.info("Processing Razorpay webhook event: {}", eventType);

        // 4. Process event — catch all exceptions to always return 200
        // Razorpay retries on non-200 responses; we must be idempotent anyway
        try {
            razorpayService.processWebhookEvent(eventType, payload);
        } catch (Exception e) {
            log.error("Error processing webhook event {}: {}", eventType, e.getMessage(), e);
            // Still return 200 — we'll process idempotently on retry if needed
        }

        return ResponseEntity.ok("received");
    }

    private void verifySignature(String body, String receivedSignature) {
        try {
            String computedSignature = Utils.getHash(body, webhookSecret);
            if (!computedSignature.equals(receivedSignature)) {
                throw new InvalidPaymentSignatureException();
            }
        } catch (InvalidPaymentSignatureException e) {
            throw e;
        } catch (Exception e) {
            log.error("Webhook signature hash computation error: {}", e.getMessage());
            throw new InvalidPaymentSignatureException();
        }
    }
}
