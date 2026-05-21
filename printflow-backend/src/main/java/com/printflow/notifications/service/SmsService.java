package com.printflow.notifications.service;

import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${app.twilio.sms-from}")
    private String smsFrom;

    public void send(String toPhone, String messageBody) {
        try {
            if (smsFrom == null || smsFrom.isBlank()) {
                log.warn("Twilio SMS from number not configured");
                return;
            }

            Message message = Message.creator(
                    new PhoneNumber(toPhone),
                    new PhoneNumber(smsFrom),
                    messageBody
            ).create();

            log.info("SMS message sent successfully. SID: {}", message.getSid());
        } catch (Exception e) {
            log.error("Failed to send SMS message to {}", toPhone, e);
            throw new RuntimeException("Failed to send SMS message: " + e.getMessage(), e);
        }
    }
}
