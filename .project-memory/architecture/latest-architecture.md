# Architecture Map
Last Updated: 2026-05-26
Analyzed Commit: 18d5449 (ui-redesign, 9 ahead of main)

## System Overview
PrintFlow is a digital order management platform for Xerox/print shops in India. It replaces the
traditional "WhatsApp + cash" workflow with a structured, real-time digital pipeline: customers upload
documents, configure print settings, and track orders; shop owners manage a priority queue, verify
payments, and communicate via built-in clarification threads. The system is a **full-stack monolith
split into two services** — a Spring Boot REST API backend and a Vite/React TypeScript SPA frontend —
backed by PostgreSQL with Flyway migrations and Firebase for Google OAuth.

## Directory Map

| Path | Role | Key Files |
|------|------|-----------|
| `printflow-backend/` | Spring Boot 3.2 REST API (Java 21) | `pom.xml`, `Dockerfile` |
| `printflow-backend/src/main/java/com/printflow/auth/` | Firebase→JWT auth bridge | `AuthService.java`, `JwtAuthFilter.java`, `JwtService.java` |
| `printflow-backend/src/main/java/com/printflow/orders/` | Core domain — orders + documents + status FSM | `OrderService.java`, `OrderStatusTransitions.java`, `PriceCalculationService.java` |
| `printflow-backend/src/main/java/com/printflow/payments/` | Payment proof submission + owner verification | `PaymentService.java` |
| `printflow-backend/src/main/java/com/printflow/notifications/` | Async multi-channel notifications | `NotificationService.java`, `EmailService.java` |
| `printflow-backend/src/main/java/com/printflow/clarifications/` | Owner↔Customer messaging per order | `ClarificationService.java` |
| `printflow-backend/src/main/java/com/printflow/queue/` | Owner dashboard & priority queue | `QueueService.java` |
| `printflow-backend/src/main/java/com/printflow/shops/` | Shop config, pricing, closure management | `ShopService.java`, `PriceCalculationService.java` |
| `printflow-backend/src/main/java/com/printflow/uploads/` | Cloudinary signed URL generation | `CloudinaryService.java`, `FileValidationService.java` |
| `printflow-backend/src/main/java/com/printflow/users/` | User CRUD, Firebase→local user sync | `UserService.java` |
| `printflow-backend/src/main/java/com/printflow/common/` | Cross-cutting: security, CORS, config, DTOs, exceptions | `SecurityConfig.java`, `GlobalExceptionHandler.java` |
| `printflow-backend/src/main/resources/db/migration/` | Flyway SQL migrations V1–V11 | `V4__create_orders.sql`, `V11__seed_default_price_config.sql` |
| `printflow-frontend/src/pages/customer/` | Customer-facing SPA pages | `NewOrderPage.tsx`, `OrderListPage.tsx`, `OrderDetailPage.tsx` |
| `printflow-frontend/src/pages/owner/` | Owner dashboard SPA pages | `DashboardPage.tsx`, `QueuePage.tsx`, `OwnerOrderDetailPage.tsx` |
| `printflow-frontend/src/pages/auth/` | Login page (Google OAuth via Firebase) | `LoginPage.tsx` |
| `printflow-frontend/src/services/` | Axios-based API client modules | `api.ts`, `orders.service.ts`, `payments.service.ts` |
| `printflow-frontend/src/store/` | Zustand global state (auth + shop) | `auth.store.ts`, `shop.store.ts` |
| `printflow-frontend/src/hooks/` | React Query hooks wrapping services | `useOrders.ts`, `useOwnerQueue.ts`, `usePriceCalculator.ts` |
| `printflow-frontend/src/components/` | Reusable UI components | `order/`, `payment/`, `upload/`, `ui/`, `layout/` |
| `printflow-frontend/src/types/` | TypeScript type definitions | `order.types.ts`, `api.types.ts` |
| `PrintFlow_Master Documents/` | Engineering reference docs (15 docs) | System arch, DB schema, API design, roadmap |
| `stitch_printflow_*/` | UI mockups exported from Stitch (Google design tool) | Screen PNGs + HTML prototypes |

## Module Responsibilities

### auth
- **Purpose:** Bridge Firebase Google OAuth tokens to internal HMAC-SHA256 JWTs
- **Consumes:** Firebase ID tokens from clients, `JWT_SECRET` env var
- **Produces:** `access_token` (1h) + `refresh_token` (UUID, 7d), user session
- **Coupled to:** users (findOrCreate), shops (shopId injection into JWT)

### orders
- **Purpose:** Core business domain — order lifecycle from creation to completion
- **Consumes:** shop pricing config, customer identity, Cloudinary file URLs
- **Produces:** Order records with status history, price calculations, order numbers
- **Coupled to:** shops (pricing), notifications (triggers), payments (status sync)

### payments
- **Purpose:** Manual payment proof workflow (UPI screenshot upload → owner verification)
- **Consumes:** Order data, customer identity, Cloudinary URLs for proof images
- **Produces:** Payment records, updates order.paymentStatus
- **Coupled to:** orders (bidirectional status sync)

### notifications
- **Purpose:** Async multi-channel notification dispatch on order status changes
- **Consumes:** Order state, customer + shop contact info
- **Produces:** Email (Gmail SMTP), WhatsApp (Twilio API), SMS (Twilio API), In-App notifications
- **Coupled to:** users, shops, orders — reads all three

### clarifications
- **Purpose:** Threaded messaging between owner and customer per order
- **Consumes:** Order ID, sender identity + role
- **Produces:** ClarificationThread records; auto-sets order status to WAITING_CLARIFICATION when owner sends first message
- **Coupled to:** orders (status side-effect)

### queue
- **Purpose:** Owner's real-time view of active orders, sorted by urgency + deadline
- **Consumes:** Shop ID derived from owner's JWT, status filters
- **Produces:** Priority-sorted order lists, dashboard stats (pending/urgent/revenue)
- **Coupled to:** shops, orders

### shops
- **Purpose:** Shop configuration — open/close state, pricing, closure scheduling, UPI/QR
- **Consumes:** Owner identity
- **Produces:** PriceConfig used by order pricing, Shop entity for all modules
- **Coupled to:** used by nearly every other module

### uploads
- **Purpose:** Generate Cloudinary signed upload URLs (client uploads directly to CDN)
- **Consumes:** File name, type, size; `CLOUDINARY_*` env vars
- **Produces:** Signed URL + credentials valid for 60s, uploads go to `orders/temp/` folder
- **Coupled to:** none (stateless service)

### users
- **Purpose:** Firebase UID → internal User entity sync (auto-create on first login)
- **Consumes:** FirebaseToken claims (uid, email, name, picture)
- **Produces:** Persistent User record with UUID-based identity
- **Coupled to:** auth (findOrCreate trigger)

### common
- **Purpose:** Security filter chain, CORS, async executor, global exception handler, shared DTOs
- **Consumes:** All modules inherit from it
- **Produces:** Standardized API responses (`ApiResponse<T>`, `PageResponse<T>`, `ErrorResponse`)
- **Coupled to:** framework-level infrastructure

## Data Flow

**Customer Places Order:**
Customer → Firebase OAuth → `POST /api/v1/auth/verify` → JWT issued → `POST /api/v1/uploads/sign` → direct upload to Cloudinary → `POST /api/v1/orders` (with Cloudinary URLs) → price calculated server-side → order persisted → async notification to owner

**Owner Manages Queue:**
Owner JWT → `GET /api/v1/owner/queue` → JPQL priority sort (CRITICAL → HIGH → NORMAL → expectedDelivery) → `PATCH /orders/{id}/status` → FSM validation → status updated → `@Async` notification to customer

## External Integrations

- **Firebase Auth:** Google OAuth provider; backend verifies ID tokens using firebase-admin SDK
- **Cloudinary:** Document/image CDN; backend generates signed URLs, client uploads directly (no backend file proxying)
- **Gmail SMTP:** Transactional email via Spring Mail; notifications dispatched asynchronously
- **Twilio:** WhatsApp and SMS dispatch via Twilio API; both `WhatsAppService` and `SmsService` call `Message.creator(...).create()`
- **PostgreSQL:** Primary data store via Spring Data JPA + Flyway migrations
