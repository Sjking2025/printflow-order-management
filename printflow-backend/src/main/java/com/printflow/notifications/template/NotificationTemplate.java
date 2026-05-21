package com.printflow.notifications.template;

import java.util.Map;

public record NotificationTemplate(
    String emailSubject,
    String emailBody,
    String whatsappMessage,
    String smsMessage
) {
    public NotificationTemplate render(Map<String, String> vars) {
        return new NotificationTemplate(
            interpolate(emailSubject, vars),
            interpolate(emailBody, vars),
            interpolate(whatsappMessage, vars),
            interpolate(smsMessage, vars)
        );
    }

    private String interpolate(String template, Map<String, String> vars) {
        if (template == null) return null;
        String result = template;
        for (var entry : vars.entrySet()) {
            result = result.replace("{" + entry.getKey() + "}", entry.getValue() != null ? entry.getValue() : "");
        }
        return result;
    }
}
