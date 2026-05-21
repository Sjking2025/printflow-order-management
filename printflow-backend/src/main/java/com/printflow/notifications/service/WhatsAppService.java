package com.printflow.notifications.service;

import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    @Value("${app.twilio.whatsapp-from}")
    private String whatsappFrom;

    public void send(String toPhone, String messageBody) {
        try {
            if (whatsappFrom == null || whatsappFrom.isBlank()) {
                log.warn("Twilio WhatsApp from number not configured");
                return;
            }

            if (!toPhone.startsWith("whatsapp:")) {
                toPhone = "whatsapp:" + toPhone;
            }
            String from = whatsappFrom;
            if (!from.startsWith("whatsapp:")) {
                from = "whatsapp:" + from;
            }

            Message message = Message.creator(
                    new PhoneNumber(toPhone),
                    new PhoneNumber(from),
                    messageBody
            ).create();

            log.info("WhatsApp message sent successfully. SID: {}", message.getSid());
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {}", toPhone, e);
            throw new RuntimeException("Failed to send WhatsApp message: " + e.getMessage(), e);
        }
    }
}
