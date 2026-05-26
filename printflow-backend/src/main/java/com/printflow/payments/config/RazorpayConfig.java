package com.printflow.payments.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Razorpay configuration — creates the RazorpayClient Spring bean.
 * Centralizes credential injection so service code never touches raw env vars.
 * If Razorpay SDK initialization fails at startup, the application will not start.
 */
@Configuration
public class RazorpayConfig {

    @Value("${app.razorpay.key-id}")
    private String keyId;

    @Value("${app.razorpay.key-secret}")
    private String keySecret;

    @Value("${app.razorpay.webhook-secret}")
    private String webhookSecret;

    @Bean
    public RazorpayClient razorpayClient() throws RazorpayException {
        return new RazorpayClient(keyId, keySecret);
    }

    public String getKeyId() { return keyId; }
    public String getKeySecret() { return keySecret; }
    public String getWebhookSecret() { return webhookSecret; }
}
