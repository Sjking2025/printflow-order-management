# Onboarding Context — PrintFlow
Last Updated: 2026-05-21

## The 60-Second Orientation

PrintFlow is a **digital order management platform for Indian Xerox/print shops**. Customers use it to
upload documents, configure print settings, and track orders in real-time. Shop owners use it to manage
a priority queue of incoming orders, verify payments, and communicate with customers. It replaces the
informal "WhatsApp + cash" workflow with structure.

It's built with **Spring Boot 3.2 (Java 21) REST API + React 18/Vite SPA + PostgreSQL**.
The codebase is **clean in structure but has some critical unfixed bugs** from the MVP sprint.

## Start Here

1. Read `.project-memory/ai-context/compressed-context.md` — ultra-dense summary (< 1 min read)
2. Read `.project-memory/architecture/latest-architecture.md` — full system map
3. Read `.project-memory/features/feature-baseline.md` — what's done, what's broken
4. Read `.project-memory/risks/tech-debt.md` — **read this before writing any code**

## How the System Actually Works

A customer logs in via Google (Firebase OAuth). The backend exchanges that Firebase ID token for an
internal JWT (1h, stored in Zustand memory — lost on page refresh). To place an order, the customer
first requests a Cloudinary signed URL from the backend, uploads their PDF/image directly to Cloudinary
(backend never touches the file), then submits the order with the Cloudinary URL. The backend
calculates price server-side using the shop's `PriceConfig`, generates an order number (`PF-2026-00001`
via PostgreSQL sequence), saves everything in one transaction, and asynchronously emails the shop owner.

The shop owner sees orders sorted by urgency (CRITICAL > HIGH > NORMAL) then by deadline in a live
queue (polling every 30s — no WebSockets). They use a 7-state FSM to move orders: PENDING → ACCEPTED
→ IN_PROGRESS → COMPLETED. They can also DELAY (with reason+ETA), set WAITING_CLARIFICATION, or
CANCEL. Each transition triggers async email notifications to the customer.

Payment is manual: customer uploads a UPI payment screenshot via the same Cloudinary flow; owner
reviews and marks VERIFIED or REJECTED.

## Things That Will Confuse You (And Why They're Like That)

- **`OrderStatusHistory` exists but is never populated:** A `history` object is built in `OrderStatusService.java:65-71` but the save call is missing. This is an MVP bug — the status audit trail feature is incomplete.

- **Refresh token always returns 401:** `POST /api/v1/auth/refresh` is implemented in `AuthController` but `AuthService.refreshToken()` immediately returns 401 with "not implemented in MVP". Users re-login every hour.

- **Twilio configured but not called:** The Twilio SDK is in `pom.xml`, credentials are in `.env`, `shouldSendWhatsApp()` returns true for some statuses — but there's no `TwilioRestClient` call anywhere. WhatsApp/SMS are only recorded to the DB as if sent.

- **`shopId` in JWT vs DB:** The `shopId` is embedded in the JWT at login time (`JwtService.generateAccessToken`), but `JwtAuthFilter` re-queries the DB every request to get it again anyway. Redundant — should read from JWT claims.

- **Firebase key file in the repo root:** `printflow-v2-firebase-adminsdk-fbsvc-546c915496.json` is a real Firebase service account credential file committed to version control. This is a security issue that needs immediate attention.

- **Single-shop assumption:** `ShopService.getDefaultShop()` uses `findAll().findFirst()`. The entire system assumes one shop. Multi-shop support would require significant routing changes.

## The Files You'll Touch Most

| File | Why You'll Need It |
|------|--------------------|
| `printflow-backend/src/main/java/com/printflow/orders/service/OrderService.java` | Core order business logic |
| `printflow-backend/src/main/java/com/printflow/orders/service/OrderStatusService.java` | Status transitions — has the history-not-saved bug |
| `printflow-backend/src/main/java/com/printflow/orders/service/PriceCalculationService.java` | Pricing engine — pure Java, no DB |
| `printflow-backend/src/main/java/com/printflow/notifications/service/NotificationService.java` | Notification templates and dispatch logic |
| `printflow-backend/src/main/resources/db/migration/` | Add new migration files here (V12, V13...) |
| `printflow-frontend/src/services/orders.service.ts` | Frontend API calls for order operations |
| `printflow-frontend/src/pages/owner/QueuePage.tsx` | Owner queue — most complex owner UI |
| `printflow-frontend/src/pages/customer/NewOrderPage.tsx` | Customer order form — most complex customer UI |

## The Files You Must Not Break

| File | Why It's Critical |
|------|-------------------|
| `printflow-backend/src/main/java/com/printflow/orders/service/OrderStatusTransitions.java` | The FSM state machine — changing allowed transitions affects all orders |
| `printflow-backend/src/main/resources/db/migration/V*.sql` | Never modify existing migrations — Flyway checksums will fail on startup |
| `printflow-backend/src/main/java/com/printflow/auth/filter/JwtAuthFilter.java` | Breaks authentication for all requests if wrong |
| `printflow-backend/src/main/java/com/printflow/common/config/SecurityConfig.java` | Misconfiguring this can open all endpoints or lock out all users |
| `printflow-frontend/src/store/auth.store.ts` | Central auth state — wrong changes cause cascading login/logout issues |

## Current Development Priority

Based on codebase analysis, the system is in **late MVP / pre-launch** state. The recommended order:

1. **Fix the 3 critical bugs** (OrderStatusHistory, credentials security, dashboard stat)
2. **Implement refresh tokens** (blocking for production UX)
3. **Wire Twilio** (marketing feature that's almost done)
4. **Frontend notifications UI** (backend API exists, UI missing)

## Known Problems

1. Order status history is never recorded (silent bug)
2. Firebase service account key is committed to repo
3. 1h JWT expiry with no refresh (forces re-login)
4. Dashboard "completed today" counts all-time
5. Order lock timer set but never enforced
6. Twilio WhatsApp/SMS not actually sent
7. 2 extra DB queries per authenticated request (JWT filter inefficiency)
8. No rate limiting anywhere
9. Ownership check missing on clarification threads

## Conventions This Codebase Uses

- **Naming:** `PascalCase` for Java classes, `camelCase` for methods/fields; TypeScript follows same. Domain objects use domain language (Order, Shop, not Manager/Handler).
- **File organization (backend):** Package-by-feature (`com.printflow.{feature}.{layer}`)
- **Error handling:** `GlobalExceptionHandler` catches `EntityNotFoundException` → 404, `InvalidStatusTransitionException` → 400, general `Exception` → 500. All wrapped in `ErrorResponse`.
- **Auth:** JWT in `Authorization: Bearer {token}` header. `SecurityUtils.getCurrentUser()` returns `UserPrincipal` from SecurityContext.
- **Database:** All IDs are `UUID`. All timestamps are `OffsetDateTime` (UTC stored, IST formatted for notifications). Status fields are `VARCHAR`, not DB enums — compared with string literals.
- **Testing:** Only 3 test files: `OrderStatusTransitionsTest`, `PriceCalculationServiceTest`, `FileValidationServiceTest` — unit tests for the most critical pure-logic services. No integration tests.
- **DTO pattern:** Java records for request/response DTOs. Entities are never directly exposed.
- **Frontend:** React Query for all server state (no Redux/Context for data). Zustand only for auth. Services layer (`*.service.ts`) wraps Axios calls. Hooks layer wraps services with React Query.
