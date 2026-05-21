# Service Boundaries & Coupling Analysis
Last Updated: 2026-05-21

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

## Tight Coupling Risks

### `JwtAuthFilter` → `UserService` + `ShopService` (Per-Request DB Hits)
**Location:** `auth/filter/JwtAuthFilter.java`
Every authenticated request hits the DB twice: once to load the User by UUID, and once to look up the
owner's shopId. The shopId is already embedded in the JWT claims at login time but the filter re-fetches
it from DB anyway. Under load, this doubles database query count per API call.
**Risk:** Performance bottleneck at scale. The JWT already carries `shopId` — the filter should read
it from the token claims, not re-query the DB.

### `OrderStatusService` → `OrderService` → `OrderRepository` (Circular-ish Pattern)
**Location:** `orders/service/OrderStatusService.java:40-44`
`OrderStatusService` calls `orderService.getOrderById()` after already having the order from
`getOrderForOwner()`. There's redundant DB load plus convoluted nested `Optional.get().get()` pattern
(lines 40-45 are confusing and potentially fragile).

### `NotificationService` → `UserRepository` + `ShopRepository` (Cross-Module Direct Repository Access)
`NotificationService` directly imports and uses `UserRepository` and `ShopRepository` from other
modules. Properly these should be service-layer calls. This creates a hidden dependency on the
data access layer of foreign modules.

### `ClarificationService` → `OrderRepository` (Direct Status Mutation)
`ClarificationService` directly mutates `order.status` to `WAITING_CLARIFICATION` without going through
`OrderStatusService`. This bypasses the FSM validation guard and the status history recording.

## Clean Boundaries

- **`uploads/`** — Completely stateless. Only dependency is the Cloudinary SDK. Could be extracted to a microservice with zero effort.
- **`common/`** — Well-isolated infrastructure layer. No domain logic.
- **`OrderStatusTransitions`** — Beautifully isolated FSM. Immutable ALLOWED map. No side effects.
- **`PriceCalculationService`** — Pure computation. No DB access. Fully testable without mocks.

## Suggested Decoupling

1. **JWT Filter optimization:** Read `shopId` from JWT claims instead of DB re-query — eliminates 1 DB hit per authenticated request.
2. **ClarificationService status change:** Route status mutation through `OrderStatusService.updateStatus()` to ensure FSM + history logging.
3. **NotificationService:** Accept `User` and `Shop` objects as method parameters instead of injecting their repositories directly.
4. **OrderStatusService cleanup:** Remove the redundant `getOrderById()` call (lines 40-45); `order` is already loaded.
