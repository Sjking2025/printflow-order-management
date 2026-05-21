# Recommended Next Steps
Last Updated: 2026-05-21
Based On: Full codebase analysis

## 🔴 Do First (Blocking or Critical)

1. **Fix `OrderStatusHistory` not being persisted**
   Why: This is a silent bug — every order status change goes completely unrecorded. The status history table will be empty in production. The `StatusTimeline.tsx` component in the frontend presumably reads this, so the feature is visually broken.
   Where: `printflow-backend/src/main/java/com/printflow/orders/service/OrderStatusService.java:73`
   Fix: Add `orderRepository` or a `OrderStatusHistoryRepository` call to persist the `history` object.
   Estimated scope: **Small (30 min)**

2. **Rotate Firebase Service Account Key + Add to `.gitignore`**
   Why: `printflow-v2-firebase-adminsdk-fbsvc-546c915496.json` is committed to the repo root. Active security risk.
   Where: Repo root; `printflow-backend/src/main/java/com/printflow/common/config/FirebaseConfig.java`
   Fix: Generate new Firebase service account key → load from `FIREBASE_SERVICE_ACCOUNT_JSON` env var only → add `*.json` or specific filename to `.gitignore`.
   Estimated scope: **Small (1 hour)**

3. **Fix `completedToday` dashboard stat**
   Why: `QueueService.getDashboardStats()` counts all-time completed orders, not just today's. The owner dashboard revenue and completion metrics are wrong.
   Where: `printflow-backend/src/main/java/com/printflow/queue/service/QueueService.java:51`
   Fix: Use `countByShopIdAndStatusAndUpdatedAtAfter()` with `today = now.withHour(0).withMinute(0)`.
   Estimated scope: **Small (20 min)**

---

## 🟡 Do Soon (High Value, Low Risk)

4. **Implement JWT filter optimization (remove per-request DB hit)**
   Why: Every authenticated request hits DB twice (user + shop lookup). The `shopId` is already in the JWT — just read it from claims.
   Where: `JwtAuthFilter.java:54-56`
   Fix: Extract `shopId` from JWT claims in `JwtService`, use in filter instead of DB lookup.
   Estimated scope: **Small (1 hour)**

5. **Implement refresh token rotation**
   Why: 1h token expiry without refresh forces re-login. Currently `POST /api/v1/auth/refresh` returns 401.
   Where: `AuthService.java:61-68`; needs: `refresh_tokens` table migration
   Fix: Store refresh token hash in DB with `userId` + `expiresAt`; on refresh, validate → issue new access + refresh tokens + invalidate old.
   Estimated scope: **Medium (half day)**

6. **Fix ClarificationService status mutation bypass**
   Why: When owner sends first clarification message, status is set directly (`order.setStatus("WAITING_CLARIFICATION")`) without FSM validation or history logging.
   Where: `ClarificationService.java:35-38`
   Fix: Inject `OrderStatusService` and call `updateStatus()` instead.
   Estimated scope: **Small (30 min)**

7. **Add ownership check to Clarification and Notification endpoints**
   Why: Any authenticated user can read any order's clarification thread or mark any notification as read.
   Where: `ClarificationController.java`, `NotificationController.java`
   Fix: Validate that the calling user is the order's customer or the shop's owner before allowing access.
   Estimated scope: **Small (1-2 hours)**

---

## 🟢 Do Eventually (Improvements)

8. **Wire Twilio WhatsApp/SMS dispatch**
   Why: The notification infrastructure is in place (DB records, templates, conditions). Twilio SDK is already included. Just needs the API call.
   Where: `NotificationService.java:62-70`
   Fix: Inject `TwilioRestClient`, call `Message.creator(...).create()`.
   Estimated scope: **Small (2-3 hours)**

9. **Add pagination to queue endpoint**
   Why: Queue returns unbounded `List<Order>` — dangerous if a shop accumulates 100+ pending orders.
   Where: `QueueController.java`, `QueueService.java`, `OrderRepository.java`
   Fix: Add `Pageable` parameter to `findQueueOrders()` query.
   Estimated scope: **Small (1 hour)**

10. **Frontend notification badge + page**
    Why: Notification API and polling constants are defined (`NOTIFICATION_POLL_INTERVAL = 60s`) but no UI exists.
    Where: `frontend/src/components/layout/Header.tsx`, new `pages/NotificationsPage.tsx`
    Fix: Add unread badge to header, link to notifications page.
    Estimated scope: **Medium (half day)**

11. **Cloudinary temp folder cleanup job**
    Why: Files uploaded to `orders/temp/` are never moved or deleted if the order creation flow is abandoned mid-way.
    Where: New `@Scheduled` job or Cloudinary webhook
    Fix: Move confirmed order files to `orders/{orderId}/` on order creation; schedule cleanup of temp files older than 2h.
    Estimated scope: **Medium (half day)**

---

## Suggested Feature Completion Order

Based on dependency graph — complete these before starting those:

1. **Fix OrderStatusHistory persistence** (no dependencies — do this immediately)
2. **Fix security credentials** (no dependencies — do this immediately)
3. **Refresh token implementation** (depends on nothing; unblocks real production usage)
4. **JWT filter optimization** (depends on JwtService changes; easy once auth is stable)
5. **Add ownership checks** (depends on understanding of auth model — do after JWT work)
6. **Wire Twilio** (depends on existing notification infrastructure — already in place)
7. **Frontend notifications UI** (depends on backend notification API — already complete)
8. **Pagination + queue improvements** (depends on stable queue endpoint — do last)

## Architecture Evolution Recommendations

1. **Introduce a `@DomainEvent` pattern** — Currently `OrderStatusService` triggers notifications inline. As the system grows, use Spring's `ApplicationEventPublisher` to decouple status changes from notification side-effects.

2. **Extract pricing to a configurable rule engine** — `PriceCalculationService` has hardcoded `switch` statements for binding and lamination types. As shop owners request custom pricing rules, this will become a maintenance burden. Consider a DB-driven pricing rule table.

3. **Add a proper API versioning strategy** — All routes are `/api/v1/...` but there's no versioning middleware or deprecation strategy. When v2 routes are needed, plan ahead.

4. **Consider adding WebSockets for real-time order updates** — Currently using 30s polling (`ORDER_POLL_INTERVAL`). For shop owners watching the queue, WebSocket push would dramatically improve UX and reduce server load.

5. **Add OpenAPI/Swagger documentation** — No API docs exist. `springdoc-openapi` can auto-generate from existing controllers.
