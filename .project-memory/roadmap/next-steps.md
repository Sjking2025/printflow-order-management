# Recommended Next Steps
Last Updated: 2026-05-27
Based On: Full codebase analysis — all 11 implementation plan items + P1–P5 notifications + clarifications + landing page verified complete

## ✅ Completed Since Last Update

All original critical/blocking items from the May 21 analysis have been resolved:

- OrderStatusHistory persistence ✅ (saved via `historyRepository` + `OrderHistoryListener`)
- Firebase key gitignored ✅ (`.gitignore` pattern added, file untracked)
- completedToday stat ✅ (JPQL filters by `updatedAt >= startOfDay`)
- JWT filter optimization ✅ (shopId read from JWT claims)
- Refresh token rotation ✅ (Axios 401 interceptor + `/auth/refresh`)
- ClarificationService status mutation ✅ (routes through `OrderStatusService`)
- Twilio WhatsApp/SMS dispatch ✅ (both services call Twilio API)
- Frontend notifications UI ✅ (NotificationsPage + header badge)
- ClarificationDrawer chat UI ✅ (full sliding drawer)

### Landing Page & Public Pages (May 27)
- Landing page with hero, features showcase, pricing tiers, CTAs ✅
- `/docs` documentation page (Quick Start, Queue, File, Payments) ✅
- `/contact` contact form page with info cards ✅
- Pricing section with 3 tiers (Free / $29 / $99) ✅
- Scoped dark theme CSS (`.landing-page`) avoiding app theme conflicts ✅

### Notifications & Clarification Fixes (May 27)
- P1: NotificationService skips IN_APP save on WAITING_CLARIFICATION ✅
- P2: NotificationsPage icons for NEW_ORDER + CLARIFICATION_REPLIED ✅
- P3: "View Order" link role-aware (owner → `/owner/orders/`, customer → `/orders/`) ✅
- P4: NotificationsPage text owner-aware via useAuthStore ✅
- ClarificationService: block messages on COMPLETED/CANCELLED → 409 ✅
- OwnerOrderDetailPage: persistent "Open Chat" button ✅

### Dashboard Enhancements (May 27)
- Lifetime Revenue metric on owner dashboard ✅
- Backend `totalRevenue()` query + `DashboardStats.revenueLifetime` ✅

### Copy Modification Feature (May 26)
- V14 migration: `copy_modify_window_mins`, `copy_modify_expires_at`, `copies_modified_at` ✅
- 6-step validation: increase-only, time window, once per document ✅
- Countdown timer + increase-only modal in OrderDetailPage ✅
- SettingsPage slider (1-30 min window) ✅

### Razorpay Payment Gateway (May 27)
- Razorpay order creation + payment verification endpoints ✅
- Hybrid payment methods: UPI, Netbanking, Wallet ✅
- V16 migration: ENUM columns → VARCHAR for Hibernate compatibility ✅
- Payment method selector on NewOrderPage ✅
- Backend validation errors surfaced in frontend UI ✅

---

## 🟡 Do Next

1. **Add ownership checks to Clarification and Notification endpoints**
   Why: Any authenticated user can read any order's clarification thread or mark any notification as read. This is the largest remaining security gap.
   Where: `ClarificationController.java`, `NotificationController.java`
   Fix: Validate that the calling user is the order's customer or the shop's owner before allowing access.
   Estimated scope: **Small (1-2 hours)**

2. **Add rate limiting (starting with upload signing endpoint)**
   Why: `POST /api/v1/uploads/sign` has no rate limiting — anyone with a valid JWT can generate unlimited signed Cloudinary URLs, potentially incurring costs.
   Where: New Spring `RateLimiter` filter or Bucket4j integration
   Estimated scope: **Small (1-2 hours)**

3. **Wire notification preference toggles (P5)**
   Why: UI exists, but backend endpoints for user notification channel preferences don't exist yet.
   What: New controller + service for user notification preferences (email/SMS/in-app on/off per channel).
   Estimated scope: **Small (1-2 hours)**

4. **Deploy backend to Render + frontend to Vercel**
   Why: The MVP feature set is now complete with Razorpay integration. The next milestone is getting this live.
   What: Backend Dockerfile exists; frontend builds to `/dist`. Need Render service config + Vercel project settings + custom domain.
   Estimated scope: **Medium (half day to full day)**

---

## 🟢 Do Eventually (Post-Launch / Polish)

5. **Cloudinary temp folder cleanup job**
   Why: Files uploaded to `orders/temp/` are never moved or deleted if the order creation flow is abandoned mid-way.
   Where: New `@Scheduled` job or Cloudinary webhook
   Fix: Schedule cleanup of temp files older than 2h.
   Estimated scope: **Small (half day)**

6. **Add pagination to queue endpoint**
   Why: Queue returns unbounded `List<Order>` — dangerous if a shop accumulates 100+ pending orders.
   Where: `QueueController.java`, `QueueService.java`, `OrderRepository.java`
   Fix: Add `Pageable` parameter to `findQueueOrders()` query.
   Estimated scope: **Small (1 hour)**

7. **Implement WebSockets for real-time queue updates**
   Why: Currently using 30s polling. For shop owners watching the queue, WebSocket push would dramatically improve UX and reduce server load.
   Estimated scope: **Medium (half day)**

8. **Razorpay refund endpoint**
   Why: Owners can verify/reject payments, but no refund flow exists for already-verified payments.
   Where: New `RazorpayController.refund()` endpoint + webhook handler
   Estimated scope: **Small (half day)**

---

## Architecture Evolution Recommendations

1. **Introduce a `@DomainEvent` pattern** — Currently `OrderStatusService` triggers notifications inline. As the system grows, use Spring's `ApplicationEventPublisher` to decouple status changes from notification side-effects.

2. **Extract pricing to a configurable rule engine** — `PriceCalculationService` has hardcoded `switch` statements for binding and lamination types. As shop owners request custom pricing rules, this will become a maintenance burden. Consider a DB-driven pricing rule table.

3. **Add a proper API versioning strategy** — All routes are `/api/v1/...` but there's no versioning middleware or deprecation strategy. When v2 routes are needed, plan ahead.

4. **Add OpenAPI/Swagger documentation** — No API docs exist. `springdoc-openapi` can auto-generate from existing controllers.
