# Unstable Systems Register
Last Updated: 2026-05-27

## ✅ Resolved Since Last Update

| Issue | Location | Resolution |
|-------|----------|------------|
| ~~Firebase service account JSON in repo root~~ | Root | `.gitignore` pattern added; file untracked by git |
| ~~No refresh token rotation~~ | `AuthService.java` + frontend `api.ts` | Axios 401 interceptor calls `/auth/refresh`; token exchanged |
| ~~Notification authorization missing~~ | `ClarificationController.java`, `NotificationController.java` | Ownership validation added in controller layer |
| ~~N+1 DB queries per authenticated request~~ | `JwtAuthFilter.java` | `shopId` read from JWT claims — no extra DB query |
| ~~`QueueService.completedToday` counts all-time~~ | `QueueService.java` | JPQL filter: `WHERE o.updatedAt >= :since` |
| ~~Order Status History never persisted~~ | `OrderStatusService.java` | `historyRepository.save(history)` called on every transition |
| ~~Order Lock Timer not enforced~~ | `OrderStatusService.java` | `lockExpiresAt` checked during transition validation |
| ~~Twilio WhatsApp/SMS not wired~~ | `WhatsAppService.java`, `SmsService.java` | Both call `Message.creator(...).create()` |
| ~~IN_APP notification on WAITING_CLARIFICATION~~ | `NotificationService.java` | Skip IN_APP save when status is WAITING_CLARIFICATION |
| ~~Clarification 500 on terminal orders~~ | `ClarificationService.java` | IllegalStateException → 409 for COMPLETED/CANCELLED |
| ~~NotificationsPage missing icons/links~~ | `NotificationsPage.tsx` | Added role-aware icons, links, and text |
| ~~No lifetime revenue metric~~ | `OrderRepository.java`, `QueueService.java` | Added `totalRevenue()` JPQL query |
| ~~Postgres ENUM incompatibility with Hibernate~~ | `V16__convert_enums_to_varchar.sql` | ENUM columns converted to VARCHAR |

## 🔴 Remaining Security Issues

| Issue | Location | Risk | Recommended Fix |
|-------|----------|------|-----------------|
| No rate limiting on any endpoint | All controllers | Upload signing endpoint abusable — anyone with valid JWT can generate unlimited Cloudinary URLs | Add rate limiting filter (Bucket4j or Spring filter) |
| No input sanitization on `description`/`notes` | Order entity TEXT fields | If rendered as HTML in customer-facing UI, XSS vectors exist | Sanitize on output if rendered as HTML |

## 🟡 Performance Risks

| Issue | Location | Risk | Recommended Fix |
|-------|----------|------|-----------------|
| Eager loading risk with `@OrderBy` on documents | `Order.java:78-81` | `@OneToMany` with `@OrderBy` triggers a JOIN every time Order is loaded | Consider lazy projection DTOs for list views |
| No pagination on queue endpoint | `QueueController.java` | `List<Order>` with no Pageable limit — could return 500+ orders | Add Pageable support (page size 20-50) |
| Revenue query reads raw double | `OrderRepository.java:41-44` | `COALESCE(SUM(...), 0)` returns `double` — floating point precision for financial data | Return `BigDecimal` from JPQL sum |

## 🟠 Fragile Systems

| System | Why Fragile | Failure Scenario |
|--------|-------------|------------------|
| Shop Open/Close enforcement | Checked only at order creation, not re-validated | If owner closes shop after orders are PENDING, new orders blocked but in-flight orders continue |
| Single-shop assumption | `ShopService.getDefaultShop()` uses `findAll().stream().findFirst()` | Multi-shop support is architecturally impossible with current routing |
| Cloudinary temp folder cleanup | Uploads go to `orders/temp/` with no cleanup job | Orphaned files accumulate if orders are abandoned mid-creation |

## Overall Assessment
The system is stable for an MVP. All previously critical issues (data integrity bugs, security vulnerability in Firebase key exposure, broken notification pipeline) have been resolved. The remaining risks are hardening concerns (rate limiting, input sanitization) and architectural limitations (single-shop, no pagination) that are acceptable for the initial deployment.
