# Feature Baseline
Generated: 2026-05-26
Commit: 18d5449 (ui-redesign, 9 ahead of main)

## ✅ Implemented Features

| Feature | Location | Notes |
|---------|----------|-------|
| Google OAuth Login | `frontend/pages/auth/LoginPage.tsx`, `backend/auth/` | Firebase token → internal JWT; 1h access token |
| Customer: Place Order | `OrderController.java`, `OrderService.java`, `NewOrderPage.tsx` | Multi-document, per-doc print config, auto pricing |
| Customer: View Order List | `OrderController.java`, `OrderListPage.tsx` | Paginated, sorted by createdAt desc |
| Customer: View Order Detail | `OrderController.java`, `OrderDetailPage.tsx` | Status timeline, price breakdown, countdown timer |
| Customer: Update Document Copies | `PATCH /orders/{id}/documents/{docId}` | Post-order edit of copy count |
| Document Upload (Cloudinary CDN) | `UploadController.java`, `CloudinaryService.java` | Signed URL, client-side direct upload, 60s TTL |
| File Validation | `FileValidationService.java` | PDF, DOCX, JPG, PNG; max 20MB per file; max 5 docs |
| Price Calculation (Server-side) | `PriceCalculationService.java` | BW/Color, A4/A3, single/double side, binding, lamination, urgency fee |
| Price Calculator (Client-side preview) | `usePriceCalculator.ts`, `PriceBreakdown.tsx` | Mirrors server logic for real-time preview |
| Order Status FSM | `OrderStatusTransitions.java`, `OrderStatusService.java` | 7-state machine with validation; PENDING→ACCEPTED→IN_PROGRESS→COMPLETED |
| Status History Tracking | `OrderStatusHistory.java`, `V7__create_order_status_history.sql`, `OrderHistoryListener.java` | Every transition recorded with actor + note; persisted via `historyRepository.save()` in `OrderStatusService` + `@PreUpdate`/`@PostPersist` listener |
| Owner: Priority Queue | `QueueController.java`, `QueueService.java`, `QueuePage.tsx` | Sorted: CRITICAL > HIGH > NORMAL > expectedDelivery > createdAt |
| Owner: Dashboard Stats | `QueueService.getDashboardStats()`, `DashboardPage.tsx` | pending, urgent, inProgress, completedToday, revenueToday |
| Owner: Accept/Reject/Progress Order | `OwnerOrderController.java`, `OrderStatusService.java` | FSM-validated status transitions |
| Owner: Set Order Delayed | `OrderStatusService.java` | Requires delayReason + delayUntil |
| Owner: Set Waiting Clarification | Via status update or `ClarificationService` auto-trigger | Auto-sets status when owner sends first message |
| Owner: Cancel Order | `OrderStatusService.java` | Requires cancellation reason (note) |
| Clarification Threads | `ClarificationController.java`, `ClarificationService.java` | Per-order message thread; owner/customer roles |
| Payment Proof Submission | `PaymentController.java`, `PaymentService.java` | Customer uploads UPI screenshot URL |
| Payment Verification | `PaymentController.java`, `PaymentService.java` | Owner marks VERIFIED/REJECTED |
| Email Notifications | `NotificationService.java`, `EmailService.java` | All status changes → Gmail SMTP; async thread pool |
| In-App Notifications | `NotificationController.java`, `NotificationRepository.java` | Stored in DB; `GET /api/v1/notifications`; `PATCH /{id}/read` |
| Shop Open/Close Toggle | `ShopController.java`, `ShopService.java`, `ClosurePage.tsx` | OPEN/TEMPORARY/PERMANENT modes with closure message + timestamp |
| Shop Pricing Configuration | `ShopController.java`, `ShopService.java`, `SettingsPage.tsx` | Owner can update all price variables live |
| Shop Settings (lock timer, UPI, QR) | `ShopService.updateSettings()` | Lock timer 2-30 min, UPI ID, QR code URL |
| Order Lock Timer (ACCEPTED) | `OrderStatusService.java` | Sets `lockExpiresAt = now + lockTimerMins` when ACCEPTED; timer enforced in transition checks |
| Order Number Generation | `OrderNumberGenerator.java`, `V10__add_order_number_sequence.sql` | Format: `PF-YYYY-NNNNN` using PostgreSQL sequence |
| Public Shop Info Endpoint | `GET /api/v1/shops/public` | No auth required; lists available shops |
| Role-Based Access Control | `SecurityConfig.java` | OWNER vs CUSTOMER roles; JWT claims; route guards |
| Frontend Route Guards | `App.tsx` (ProtectedRoute, OwnerRoute) | Redirects unauthenticated/wrong-role users |
| Default Price Seeding | `V11__seed_default_price_config.sql` | Reasonable defaults seeded on DB migration |
| Actuator Health Check | `/actuator/health` | No auth; suitable for load balancer probes |

## 🧊 Abandoned / Dormant

| Feature | Evidence | Risk |
|---------|----------|------|
| MapStruct | Declared in `pom.xml`; `OrderMapper.java` and `UserMapper.java` exist as classes | Mappers are hand-coded methods, not MapStruct `@Mapper` interfaces — the dependency is unused |
| Branch-specific owner pages (mobile) | Stitch designs exist for `owner_mobile_dashboard` | No dedicated mobile route or layout in frontend code |

## API Surface

| Method | Route | Handler | Auth Required | Role |
|--------|-------|---------|---------------|------|
| POST | `/api/v1/auth/verify` | `AuthController.verify` | ❌ | Any |
| POST | `/api/v1/auth/refresh` | `AuthController.refresh` | ❌ | Any |
| GET | `/api/v1/auth/me` | `AuthController.me` | ✅ | Any |
| GET | `/api/v1/users/me` | `UserController.me` | ✅ | Any |
| GET | `/api/v1/shops/public` | `ShopController.getPublicShops` | ❌ | Any |
| GET | `/api/v1/shops/{shopId}` | `ShopController.getShop` | ✅ | Any |
| GET | `/api/v1/shops/{shopId}/prices` | `ShopController.getPrices` | ✅ | Any |
| PATCH | `/api/v1/shops/{shopId}/prices` | `ShopController.updatePrices` | ✅ | OWNER |
| PATCH | `/api/v1/shops/{shopId}/settings` | `ShopController.updateSettings` | ✅ | OWNER |
| POST | `/api/v1/owner/closure` | `ShopController.setClosure` | ✅ | OWNER |
| POST | `/api/v1/orders` | `OrderController.create` | ✅ | CUSTOMER |
| GET | `/api/v1/orders` | `OrderController.list` | ✅ | CUSTOMER |
| GET | `/api/v1/orders/{orderId}` | `OrderController.get` | ✅ | CUSTOMER |
| PATCH | `/api/v1/orders/{orderId}/documents/{docId}` | `OrderController.updateCopies` | ✅ | CUSTOMER |
| GET | `/api/v1/owner/orders/{orderId}` | `OwnerOrderController.get` | ✅ | OWNER |
| PATCH | `/api/v1/orders/{orderId}/status` | `OwnerOrderController.updateStatus` | ✅ | OWNER |
| GET | `/api/v1/owner/queue` | `QueueController.queue` | ✅ | OWNER |
| GET | `/api/v1/owner/dashboard` | `QueueController.dashboard` | ✅ | OWNER |
| POST | `/api/v1/payments/{orderId}/proof` | `PaymentController.submitProof` | ✅ | CUSTOMER |
| PATCH | `/api/v1/payments/{paymentId}/verify` | `PaymentController.verify` | ✅ | OWNER |
| POST | `/api/v1/orders/{orderId}/clarifications` | `ClarificationController.send` | ✅ | Any |
| GET | `/api/v1/orders/{orderId}/clarifications` | `ClarificationController.get` | ✅ | Any |
| GET | `/api/v1/notifications` | `NotificationController.list` | ✅ | Any |
| PATCH | `/api/v1/notifications/{id}/read` | `NotificationController.markRead` | ✅ | Any |
| POST | `/api/v1/uploads/sign` | `UploadController.sign` | ✅ | Any |
| GET | `/actuator/health` | Spring Actuator | ❌ | Any |
