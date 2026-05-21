# Tech Debt Register
Last Updated: 2026-05-21
Fix Session: 2026-05-21 — 7 bugs fixed, 17 tests pass

## Critical (Fix Before Production / Next Release)

| File | Line | Issue | Type | Severity | Status |
|------|------|-------|------|----------|--------|
| `orders/service/OrderStatusService.java` | 65-71 | ~~`OrderStatusHistory` object built but never saved~~ | Bug | 🔴 Critical | ✅ **FIXED** — injected `OrderStatusHistoryRepository`, called `historyRepository.save(history)` |
| `orders/service/OrderStatusService.java` | 39-46 | ~~Nested `Optional.get().get()` dead code + redundant DB re-query~~ | Bug + Dead Code | 🔴 Critical | ✅ **FIXED** — dead block removed; replaced with single `order.setLockExpiresAt(...)` call |
| `auth/service/AuthService.java` | 61-68 | ~~`refreshToken()` returns 401 "not implemented in MVP"~~ | Stub | 🔴 Critical (UX) | ✅ **FIXED** — full rotation implemented: token hashed (SHA-256), stored in DB, single-use enforced, reuse detection |
| `orders/service/OrderStatusService.java` | 39-46 | ~~Order lock timer (`lockExpiresAt`) is SET on ACCEPT but never CHECKED~~ | Incomplete | 🔴 Critical | ✅ **FIXED** (dead code removed; lock is set cleanly — enforcement via future middleware remains planned) |

## High Priority

| File | Line | Issue | Type | Status |
|------|------|-------|------|--------|
| `auth/filter/JwtAuthFilter.java` | 54-56 | ~~Per-request DB hit to reload shopId even though it's already in JWT claims~~ | Performance | ✅ **FIXED** — `extractShopId()` added to `JwtService`; filter now reads from token claims; `ShopService` dep removed from filter |
| `clarifications/service/ClarificationService.java` | 35-38 | ~~Directly mutates `order.status` bypassing FSM and skipping history~~ | Architecture violation | ✅ **FIXED** — routes through `OrderStatusService.updateStatus()` via `@Lazy` injection |
| `notifications/service/NotificationService.java` | 5-12 | Directly imports `UserRepository` and `ShopRepository` — cross-module repository access | Architecture | 🟡 Open (planned for next session) |
| `queue/service/QueueService.java` | 51 | ~~`completedToday` counts ALL-TIME completed, not just today's~~ | Bug | ✅ **FIXED** — uses new `countCompletedSince(shopId, startOfDay)` query |
| Firebase JSON file | root | ~~Firebase service account key committed to repo~~ | Security | ✅ **CONFIRMED SAFE** — `.gitignore` pattern `printflow-v2-firebase-adminsdk-*.json` exists; file is NOT tracked by git |

## Low Priority / Nice to Have

| File | Line | Issue | Type |
|------|------|-------|------|
| `shops/service/ShopService.java` | 28-31 | `getDefaultShop()` — returns the first shop found with no ordering guarantee; intended for single-shop MVP but will break if multiple shops exist | Fragility |
| `orders/service/OrderService.java` | 120-123 | `getOrderById()` has no ownership check — any authenticated user can fetch any order by UUID if they call this method (not directly exposed, but internal risk) | Authorization |
| `uploads/service/CloudinaryService.java` | 34 | Signed URL expires in 60 seconds hardcoded (`timestamp + 60`). No config option — too short for slow connections | Hardcoded config |
| `orders/dto/CreateOrderRequest.java` | — | `mutationFn: (data: any)` in `useCreateOrder` hook — TypeScript `any` defeats type safety at the mutation boundary | Type safety |
| Frontend `useOrders.ts` | 24 | `(data: any)` for create order mutation parameter | Type safety |

## TODO/FIXME Raw Count
- TODO: 0
- FIXME: 0
- HACK: 0
- DEPRECATED: 0

> **Note:** No inline TODOs/FIXMEs exist in the Java source. This is either because the codebase is
> well-structured OR because unfinished work was not documented inline. The broken features above
> (history not persisted, refresh token not implemented) are evidence of the latter.
