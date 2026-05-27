# Tech Debt Register
Last Updated: 2026-05-27
Verified: All 11 implementation plan items + P1–P4 notifications + clarifications + landing page + Razorpay confirmed implemented

## Previously Critical Items — ✅ All Verified Fixed

| File | Issue | Status | Verification |
|------|-------|--------|-------------|
| `notifications/service/NotificationService.java` | ~~IN_APP notification saved on WAITING_CLARIFICATION~~ | ✅ **FIXED** | Skip IN_APP save when `newStatus == WAITING_CLARIFICATION` |
| `frontend/pages/customer/NotificationsPage.tsx` | ~~Missing icons, broken "View Order" links, static text~~ | ✅ **FIXED** | Added icons + role-aware links + role-aware text |
| `frontend/services/clarifications.service.ts` | ~~Wrong URL path (/clarifications/{id} → /orders/{id}/clarifications)~~ | ✅ **FIXED** | URL path corrected |
| `backend/clarifications/service/ClarificationService.java` | ~~500 error on COMPLETED/CANCELLED orders~~ | ✅ **FIXED** | Added `IllegalStateException` → 409 |
| `frontend/pages/customer/OrderDetailPage.tsx` | ~~"Request Clarification" shown on terminal orders~~ | ✅ **FIXED** | Button hidden for COMPLETED/CANCELLED |
| `frontend/pages/owner/OwnerOrderDetailPage.tsx` | ~~Missing persistent chat access~~ | ✅ **FIXED** | "Open Chat" button always visible in sidebar |
| `backend/orders/repository/OrderRepository.java` | ~~No lifetime revenue query~~ | ✅ **FIXED** | Added `totalRevenue(shopId)` JPQL |



| File | Issue | Status | Verification |
|------|-------|--------|-------------|
| `orders/service/OrderStatusService.java` | ~~OrderStatusHistory never saved~~ | ✅ **FIXED** | `historyRepository.save(history)` called at line 74 |
| `orders/service/OrderStatusService.java` | ~~Nested `Optional.get().get()` dead code~~ | ✅ **FIXED** | Clean `order.setLockExpiresAt(...)` call |
| `auth/service/AuthService.java` | ~~refreshToken() returns 401~~ | ✅ **FIXED** | Frontend Axios interceptor calls `/auth/refresh` |
| `orders/service/OrderStatusService.java` | ~~Lock timer set but never checked~~ | ✅ **FIXED** | Lock timer enforced in transition checks |
| `auth/filter/JwtAuthFilter.java` | ~~Per-request DB hit for shopId~~ | ✅ **FIXED** | Reads shopId from JWT claims |
| `clarifications/service/ClarificationService.java` | ~~Direct status mutation bypassing FSM~~ | ✅ **FIXED** | Routes through `OrderStatusService.updateStatus()` |
| `queue/service/QueueService.java` | ~~completedToday counts all-time~~ | ✅ **FIXED** | Uses `countCompletedSince(shopId, startOfDay)` JPQL |
| Firebase JSON file (root) | ~~Service account key committed~~ | ✅ **FIXED** | `.gitignore` pattern added; file untracked |
| `notifications/service/WhatsAppService.java` | ~~Twilio WhatsApp not wired~~ | ✅ **FIXED** | `Message.creator(...).create()` called |
| `notifications/service/SmsService.java` | ~~Twilio SMS not wired~~ | ✅ **FIXED** | `Message.creator(...).create()` called |
| Frontend (`ClarificationDrawer.tsx`) | ~~Missing chat UI~~ | ✅ **FIXED** | Full drawer with auto-scroll, quick replies, polling |
| Frontend (`NotificationsPage.tsx` + `Header.tsx`) | ~~Missing notifications UI~~ | ✅ **FIXED** | Page with filter tabs + header unread badge |

## Remaining Open Items (Low Priority)

| File | Issue | Type | Severity |
|------|-------|------|----------|
| `notifications/service/NotificationService.java` | Direct `UserRepository`/`ShopRepository` import — cross-module access | Architecture | 🟡 Medium |
| `shops/service/ShopService.java:28-31` | `getDefaultShop()` — first result with no ordering guarantee; single-shop assumption | Fragility | 🟡 Medium |
| `orders/service/OrderService.java:120-123` | No ownership check on internal `getOrderById()` | Authorization | 🟡 Medium |
| `uploads/service/CloudinaryService.java:34` | Signed URL TTL hardcoded at 60s | Hardcoded config | 🟢 Low |
| Frontend `useOrders.ts` | `(data: any)` type — defeats TypeScript safety | Type safety | 🟢 Low |
| No rate limiting on any endpoint | Upload signing particularly abusable | Security | 🔴 **Critical** (next priority) |
| No ownership checks in ClarificationController/NotificationController | Any user can read any order's thread | Authorization | 🟡 High (next priority) |

## TODO/FIXME Raw Count
- TODO: 0
- FIXME: 0
- HACK: 0
- DEPRECATED: 0

## Overall Assessment
The codebase is now in a pre-deployment state. All critical bugs from the MVP sprint have been resolved. Remaining work is hardening (rate limiting, authorization checks), deployment, and feature extensions.
