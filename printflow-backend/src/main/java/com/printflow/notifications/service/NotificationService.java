package com.printflow.notifications.service;

import com.printflow.notifications.entity.Notification;
import com.printflow.notifications.repository.NotificationRepository;
import com.printflow.notifications.template.NotificationTemplate;
import com.printflow.orders.entity.Order;
import com.printflow.orders.enums.OrderStatus;
import com.printflow.shops.entity.Shop;
import com.printflow.shops.repository.ShopRepository;
import com.printflow.users.entity.User;
import com.printflow.users.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final EmailService emailService;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final WhatsAppService whatsappService;
    private final SmsService smsService;

    public NotificationService(EmailService emailService,
                               NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               ShopRepository shopRepository,
                               WhatsAppService whatsappService,
                               SmsService smsService) {
        this.emailService = emailService;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
        this.whatsappService = whatsappService;
        this.smsService = smsService;
    }

    @Async("notificationExecutor")
    public void notifyOrderStatusChange(Order order, OrderStatus newStatus) {
        try {
            User customer = userRepository.findById(order.getCustomerId())
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
            Shop shop = shopRepository.findById(order.getShopId())
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));

            Map<String, String> vars = buildVars(order, shop, customer);
            NotificationTemplate template = resolveTemplate(newStatus, vars);

            if (template.emailSubject() != null && customer.getEmail() != null) {
                emailService.send(customer.getEmail(), template.emailSubject(), template.emailBody());
                saveNotification(customer.getId(), order.getId(), newStatus.name(), "EMAIL",
                    template.emailSubject(), template.emailBody());
            }

            if (shouldSendWhatsApp(newStatus) && customer.getPhone() != null && template.whatsappMessage() != null) {
                whatsappService.send(customer.getPhone(), template.whatsappMessage());
                saveNotification(customer.getId(), order.getId(), newStatus.name(), "WHATSAPP",
                    null, template.whatsappMessage());
            }

            if (shouldSendSms(newStatus) && customer.getPhone() != null && template.smsMessage() != null) {
                smsService.send(customer.getPhone(), template.smsMessage());
                saveNotification(customer.getId(), order.getId(), newStatus.name(), "SMS",
                    null, template.smsMessage());
            }

            if (newStatus != OrderStatus.WAITING_CLARIFICATION) {
                saveNotification(customer.getId(), order.getId(), newStatus.name(), "IN_APP",
                    template.emailSubject(), template.emailBody());
            }

        } catch (Exception e) {
            log.error("Failed to send notification for order {}: {}", order.getOrderNumber(), e.getMessage());
        }
    }

    public void notifyNewOrderToOwner(Order order) {
        try {
            Shop shop = shopRepository.findById(order.getShopId())
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
            User owner = userRepository.findById(shop.getOwnerId())
                .orElseThrow(() -> new EntityNotFoundException("Owner not found"));

            String subject = String.format("New order received — %s (%s)", order.getOrderNumber(), order.getUrgency());
            String body = String.format("""
                New order received on PrintFlow.

                Order: %s
                Urgency: %s
                Documents: %d
                Total: ₹%s
                Expected by: %s

                View and accept in your dashboard.""",
                order.getOrderNumber(), order.getUrgency(),
                order.getDocuments() != null ? order.getDocuments().size() : 0,
                order.getTotalAmount(),
                order.getExpectedDelivery() != null ? order.getExpectedDelivery().format(DTF) : "N/A");

            if (owner.getEmail() != null) {
                emailService.send(owner.getEmail(), subject, body);
                saveNotification(owner.getId(), order.getId(), "NEW_ORDER", "EMAIL", subject, body);
            }

            saveNotification(owner.getId(), order.getId(), "NEW_ORDER", "IN_APP", subject, body);

        } catch (Exception e) {
            log.error("Failed to notify owner about new order: {}", e.getMessage());
        }
    }

    @Async("notificationExecutor")
    public void notifyClarificationRequested(Order order, String clarificationMessage) {
        try {
            User customer = userRepository.findById(order.getCustomerId())
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
            Shop shop = shopRepository.findById(order.getShopId())
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));

            String subject = String.format("Action needed for your order %s \u2753", order.getOrderNumber());
            String body = String.format("""
                Hi %s,
                
                %s has a question about your order and needs your response before proceeding.
                
                Order: %s
                Question: "%s"
                
                Please reply in the PrintFlow app.
                
                — PrintFlow""", customer.getName(), shop.getName(), order.getOrderNumber(), clarificationMessage);

            if (customer.getEmail() != null) {
                emailService.send(customer.getEmail(), subject, body);
                saveNotification(customer.getId(), order.getId(), "WAITING_CLARIFICATION", "EMAIL", subject, body);
            }

            saveNotification(customer.getId(), order.getId(), "WAITING_CLARIFICATION", "IN_APP", subject, body);

            if (customer.getPhone() != null) {
                String waMsg = String.format("\u2753 *Question about your order %s*\n%s: \"%s\"\nPlease respond in the app.", 
                        order.getOrderNumber(), shop.getName(), clarificationMessage);
                whatsappService.send(customer.getPhone(), waMsg);
                saveNotification(customer.getId(), order.getId(), "WAITING_CLARIFICATION", "WHATSAPP", null, waMsg);
            }

        } catch (Exception e) {
            log.error("Failed to send clarification notification for order {}", order.getOrderNumber(), e);
        }
    }

    @Async("notificationExecutor")
    public void notifyClarificationReplied(Order order, String replyMessage) {
        try {
            Shop shop = shopRepository.findById(order.getShopId())
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
            User owner = userRepository.findById(shop.getOwnerId())
                .orElseThrow(() -> new EntityNotFoundException("Owner not found"));

            String subject = String.format("Customer replied to clarification — %s", order.getOrderNumber());
            String body = String.format("""
                Customer has replied to your clarification request.
                
                Order: %s
                Reply: "%s"
                
                Please check the clarification chat in your dashboard.
                
                — PrintFlow""", order.getOrderNumber(), replyMessage);

            if (owner.getEmail() != null) {
                emailService.send(owner.getEmail(), subject, body);
                saveNotification(owner.getId(), order.getId(), "CLARIFICATION_REPLIED", "EMAIL", subject, body);
            }

            saveNotification(owner.getId(), order.getId(), "CLARIFICATION_REPLIED", "IN_APP", subject, body);

        } catch (Exception e) {
            log.error("Failed to notify owner about clarification reply: {}", e.getMessage());
        }
    }

    private boolean shouldSendWhatsApp(OrderStatus status) {
        return Set.of(OrderStatus.ACCEPTED, OrderStatus.DELAYED,
                      OrderStatus.WAITING_CLARIFICATION, OrderStatus.COMPLETED,
                      OrderStatus.CANCELLED).contains(status);
    }

    private boolean shouldSendSms(OrderStatus status) {
        return Set.of(OrderStatus.DELAYED, OrderStatus.COMPLETED).contains(status);
    }

    private void saveNotification(UUID userId, UUID orderId, String type, String channel,
                                  String subject, String message) {
        Notification notification = Notification.builder()
            .userId(userId)
            .orderId(orderId)
            .type(type)
            .channel(channel)
            .subject(subject)
            .message(message)
            .status("SENT")
            .sentAt(OffsetDateTime.now())
            .build();
        notificationRepository.save(notification);
    }

    private Map<String, String> buildVars(Order order, Shop shop, User customer) {
        return Map.of(
            "customerName", customer.getName(),
            "orderNumber", order.getOrderNumber(),
            "documentCount", String.valueOf(order.getDocuments() != null ? order.getDocuments().size() : 0),
            "totalAmount", order.getTotalAmount() != null ? order.getTotalAmount().toPlainString() : "0",
            "expectedDelivery", order.getExpectedDelivery() != null ? order.getExpectedDelivery().format(DTF) : "N/A",
            "shopName", shop.getName(),
            "shopPhone", shop.getPhone() != null ? shop.getPhone() : "",
            "shopAddress", shop.getAddress() != null ? shop.getAddress() : "",
            "delayReason", order.getDelayReason() != null ? order.getDelayReason() : "",
            "delayUntil", order.getDelayUntil() != null ? order.getDelayUntil().format(DTF) : ""
        );
    }

    private NotificationTemplate resolveTemplate(OrderStatus status, Map<String, String> vars) {
        NotificationTemplate template = switch (status) {
            case ACCEPTED -> new NotificationTemplate(
                "Your order {orderNumber} has been accepted",
                """
                Hi {customerName},
                
                Good news! Your print order has been accepted and is now in the queue.
                
                Order: {orderNumber}
                Items: {documentCount} document(s)
                Total: ₹{totalAmount}
                Expected by: {expectedDelivery}
                
                We'll notify you when your order is ready for pickup.
                
                — {shopName}""",
                "\u2705 *Order Accepted*\nHi {customerName}, your order *{orderNumber}* has been accepted.\nExpected ready by: *{expectedDelivery}*",
                null);
            case IN_PROGRESS -> new NotificationTemplate(
                "Printing started for order {orderNumber}",
                """
                Hi {customerName},
                
                We've started printing your order.
                
                Order: {orderNumber}
                Status: In Progress
                
                We'll notify you as soon as it's ready!
                
                — {shopName}""",
                null, null);
            case COMPLETED -> new NotificationTemplate(
                "Your order {orderNumber} is ready for pickup!",
                """
                Hi {customerName},
                
                Great news! Your print order is ready.
                
                Order: {orderNumber}
                Items: {documentCount} document(s)
                Total Paid: ₹{totalAmount}
                
                Please visit {shopName} to collect your order.
                {shopAddress}
                
                — {shopName}""",
                "\uD83C\uDF89 *Order Ready for Pickup!*\nHi {customerName}, your order *{orderNumber}* is ready!\n\nCome collect it from:\n*{shopName}*\n{shopAddress}",
                "PrintFlow: Order {orderNumber} is ready! Come pick it up from {shopName}.");
            case DELAYED -> new NotificationTemplate(
                "Delay update for your order {orderNumber}",
                """
                Hi {customerName},
                
                We wanted to let you know that your order is delayed.
                
                Order: {orderNumber}
                Reason: {delayReason}
                New estimated time: {delayUntil}
                
                We apologize for the inconvenience.
                
                — {shopName}""",
                "\u23F3 *Order Delayed*\nHi {customerName}, your order *{orderNumber}* is delayed.\nReason: {delayReason}\nNew ETA: *{delayUntil}*",
                "PrintFlow: Order {orderNumber} delayed. Reason: {delayReason}. New ETA: {delayUntil}.");
            case WAITING_CLARIFICATION -> new NotificationTemplate(
                "Action needed for your order {orderNumber}",
                """
                Hi {customerName},
                
                {shopName} has a question about your order.
                
                Order: {orderNumber}
                
                Please check your order details and respond.
                
                — PrintFlow""",
                "\u2753 *Question about your order*\nOrder *{orderNumber}*:\nPlease respond in the app.",
                null);
            case CANCELLED -> new NotificationTemplate(
                "Your order {orderNumber} has been cancelled",
                """
                Hi {customerName},
                
                Your print order has been cancelled.
                
                Order: {orderNumber}
                
                If you believe this is an error, please contact the shop directly: {shopPhone}
                
                — PrintFlow""",
                "\u274C *Order Cancelled*\nOrder *{orderNumber}* has been cancelled.\nContact shop: {shopPhone}",
                null);
            default -> null;
        };

        if (template == null) return null;
        return template.render(vars);
    }

    /**
     * Notifies the shop owner when an order is auto-accepted via Razorpay gateway payment.
     * Sent asynchronously — failures are swallowed (notification is non-critical).
     */
    @Async("notificationExecutor")
    public void notifyGatewayPaymentSuccessToOwner(Order order) {
        try {
            Shop shop = shopRepository.findById(order.getShopId())
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
            User owner = userRepository.findById(shop.getOwnerId())
                .orElseThrow(() -> new EntityNotFoundException("Owner not found"));

            String subject = String.format(
                "Auto-accepted: Order %s — Payment received via Razorpay",
                order.getOrderNumber());

            String body = String.format("""
                A new order has been automatically accepted after successful online payment.

                Order: %s
                Amount: ₹%s
                Payment: Razorpay (online)

                No action required — the order is now active in your queue.

                — PrintFlow""",
                order.getOrderNumber(),
                order.getTotalAmount());

            if (owner.getEmail() != null) {
                emailService.send(owner.getEmail(), subject, body);
                saveNotification(owner.getId(), order.getId(),
                    "GATEWAY_PAYMENT_RECEIVED", "EMAIL", subject, body);
            }

            saveNotification(owner.getId(), order.getId(),
                "GATEWAY_PAYMENT_RECEIVED", "IN_APP", subject, body);

        } catch (Exception e) {
            log.error("Failed to notify owner of gateway payment for order {}: {}",
                order.getOrderNumber(), e.getMessage());
        }
    }

    /**
     * Notifies the customer that their Razorpay payment was confirmed and order accepted.
     * Complements the existing ACCEPTED status notification with payment-specific context.
     */
    @Async("notificationExecutor")
    public void notifyCustomerPaymentSuccess(Order order, String gatewayPaymentId) {
        try {
            User customer = userRepository.findById(order.getCustomerId()).orElseThrow();
            Shop shop = shopRepository.findById(order.getShopId()).orElseThrow();

            String subject = String.format("Payment confirmed — Order %s accepted", order.getOrderNumber());
            String body = String.format("""
                Hi %s,

                Your payment has been received and your order is now confirmed!

                Order: %s
                Amount: ₹%s
                Payment ID: %s
                Shop: %s

                We'll notify you when your order starts printing.

                — PrintFlow""",
                customer.getName(), order.getOrderNumber(),
                order.getTotalAmount(), gatewayPaymentId, shop.getName());

            if (customer.getEmail() != null) {
                emailService.send(customer.getEmail(), subject, body);
                saveNotification(customer.getId(), order.getId(),
                    "PAYMENT_SUCCESS", "EMAIL", subject, body);
            }

            saveNotification(customer.getId(), order.getId(),
                "PAYMENT_SUCCESS", "IN_APP", subject, body);

        } catch (Exception e) {
            log.error("Failed to send payment success notification for order {}: {}",
                order.getOrderNumber(), e.getMessage());
        }
    }
}
