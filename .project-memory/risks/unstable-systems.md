# Unstable Systems Register
Last Updated: 2026-05-21

## 🔴 Critical Security Issues

| Issue | Location | Risk | Recommended Fix |
|-------|----------|------|-----------------|
| Firebase service account JSON in repo root | `printflow-v2-firebase-adminsdk-fbsvc-546c915496.json` | Full Firebase project access for anyone with repo access — can impersonate any user, read auth database | Move to env var only; add to `.gitignore`; rotate the key immediately |
| CSRF disabled globally | `SecurityConfig.java:25` | Stateless JWT API generally safe, but if any cookie-based session is introduced later this becomes an attack surface | Acceptable for pure JWT APIs — document the assumption explicitly |
| JWT stored in Zustand (in-memory) | `auth.store.ts` | Tokens lost on page refresh (forces re-login) but avoids XSS via localStorage. Trade-off is acceptable but undocumented | Add persistence (sessionStorage) with appropriate XSS consideration; document the decision |
| No refresh token rotation | `AuthService.java:61-68` | Users with stolen access tokens have full access for the 1h lifetime with no revocation mechanism | Implement proper refresh token flow with DB storage and rotation |
| Notification authorization missing | `ClarificationController.java`, `NotificationController.java` | Any authenticated user (customer or owner) can send messages or read notifications for any orderId — no ownership check in controller | Add ownership validation in controller layer |

## 🟡 Performance Risks

| Issue | Location | Risk | Recommended Fix |
|-------|----------|------|-----------------|
| N+1 DB queries per authenticated request | `JwtAuthFilter.java:50-56` | Every request: 1 query for User + 1 query for Shop (OWNER only). At 100 req/s, this is 200 unnecessary queries/s | Read `shopId` from JWT claims; cache user lookup with 5min TTL |
| `QueueService.completedToday` counts all-time | `QueueService.java:51` | Dashboard stat is wrong — shows ALL completed orders, not just today's | Fix JPQL query to filter by `updatedAt >= today` |
| Eager loading risk with `@OrderBy` on documents | `Order.java:78-81` | `@OneToMany` with `@OrderBy` triggers a JOIN query every time Order is loaded. For queue views showing 50+ orders, this could be severe | Consider lazy projection DTOs for list views; separate documents fetch from queue fetch |
| No pagination on queue endpoint | `QueueController.java` | `getPriorityQueue()` returns a `List<Order>` with no Pageable limit — if 500 pending orders exist, all are returned | Add Pageable support with sane default (page size 20-50) |
| Revenue query reads raw double | `OrderRepository.java:41-44` | `COALESCE(SUM(...), 0)` returns `double` — floating point precision issues for financial data | Return `BigDecimal` from JPQL sum |

## 🟠 Fragile Systems

| System | Why Fragile | Failure Scenario |
|--------|-------------|------------------|
| Order Status History | `OrderStatusHistory` is constructed but not saved (missing `save()` call) | Status audit trail is permanently broken — every status transition goes unrecorded |
| Order Lock Timer | `lockExpiresAt` set but never read/enforced | Owner can ACCEPT same order multiple times concurrently — no actual concurrency protection |
| Shop Open/Close enforcement | Checked only at order creation, not re-validated | If owner closes shop after orders are PENDING, new orders blocked but in-flight orders continue |
| Single-shop assumption | `ShopService.getDefaultShop()` uses `findAll().stream().findFirst()` | Multi-shop support is architecturally impossible with current routing (no shop selection by customer) |
| Cloudinary temp folder cleanup | Uploads go to `orders/temp/` with no cleanup job | Orphaned files accumulate if orders are abandoned mid-creation |

## ⚠️ Technical Debt With Active Risk

1. **`OrderStatusHistory` never persisted** — The audit trail that owners/customers rely on for tracking order history is broken. This will surface immediately in production when status timeline shows no history.

2. **Firebase credentials in repo** — If this is a public or shared-access repo, credentials exposure is an active security incident. Rotate keys now.

3. **No rate limiting** — No rate limiting on any endpoint. The upload signing endpoint (`POST /api/v1/uploads/sign`) is particularly abusable — anyone with a valid JWT can generate unlimited signed Cloudinary URLs.

4. **No input sanitization on `description` and `notes` fields** — These TEXT columns accept arbitrary content. If this is ever rendered as HTML in a customer-facing UI, XSS vectors exist.
