# Service Boundaries & Coupling Analysis
Last Updated: 2026-05-26

## Coupling Heatmap

| Module | Depends On | Depended On By | Coupling Level |
|--------|-----------|----------------|----------------|
| `auth` | users, shops, jwt | (entry point) | 🟡 Medium |
| `orders` | shops (pricing), notifications | payments, queue, clarifications | 🔴 High |
| `payments` | orders | (leaf module) | 🟡 Medium |
| `notifications` | orders, users, shops | orders (triggered by) | 🟡 Medium |
| `clarifications` | orders | (leaf module) | 🟢 Low |
| `queue` | orders, shops | (leaf module) | 🟡 Medium |
| `shops` | (none) | auth, orders, queue, payments | 🔴 High (widely consumed) |
| `uploads` | (none, cloudinary SDK) | (leaf module) | 🟢 Low |
| `users` | (none, firebase SDK) | auth, notifications, jwt filter | 🟡 Medium |
| `common` | (framework only) | everything | 🔴 High (infrastructure) |

## ✅ Previously Tight Coupling — Now Resolved

| Issue | Location | Resolution |
|-------|----------|------------|
| ~~JwtAuthFilter → UserService + ShopService (per-request DB hits)~~ | `JwtAuthFilter.java` | `shopId` read from JWT claims via `jwtService.extractShopId()` — no extra DB query |
| ~~OrderStatusService → OrderService (redundant getOrderById + dead code)~~ | `OrderStatusService.java:40-44` | Dead `Optional.get().get()` block removed; `order` already in scope |
| ~~ClarificationService → OrderRepository (direct status mutation)~~ | `ClarificationService.java` | Routes through `OrderStatusService.updateStatus()` via `@Lazy` injection |

## Remaining Tight Coupling

### `NotificationService` → `UserRepository` + `ShopRepository` (Cross-Module Direct Repository Access)
`NotificationService` directly imports and uses `UserRepository` and `ShopRepository` from other
modules. Properly these should be service-layer calls. This creates a hidden dependency on the
data access layer of foreign modules.

## Clean Boundaries

- **`uploads/`** — Completely stateless. Only dependency is the Cloudinary SDK. Could be extracted to a microservice with zero effort.
- **`common/`** — Well-isolated infrastructure layer. No domain logic.
- **`OrderStatusTransitions`** — Beautifully isolated FSM. Immutable ALLOWED map. No side effects.
- **`PriceCalculationService`** — Pure computation. No DB access. Fully testable without mocks.

## Suggested Decoupling

1. **NotificationService:** Accept `User` and `Shop` objects as method parameters instead of injecting their repositories directly.
