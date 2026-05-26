# Runtime Execution Flow
Last Updated: 2026-05-26

## Startup Sequence

1. **JVM starts** → Spring Boot auto-configuration loads
2. **Config loaded** — `application.yml` reads env vars: `DATABASE_URL`, `JWT_SECRET`, `FIREBASE_PROJECT_ID`, `CLOUDINARY_*`, `TWILIO_*`, `MAIL_*`
3. **Flyway migrations run** — V1→V11 SQL migrations applied against PostgreSQL (schema is validated, not auto-created by Hibernate: `ddl-auto: validate`)
4. **Firebase Admin SDK initialized** — `FirebaseConfig` loads service account JSON from env var or file path
5. **HikariCP pool established** — max 10, min 2 connections
6. **Async executor configured** — `notificationExecutor` thread pool: core=5, max=20, queue=500
7. **Security filter chain registered** — `JwtAuthFilter` placed before `UsernamePasswordAuthenticationFilter`
8. **Spring Boot embedded Tomcat starts on port 8080**

## Request Lifecycle (Authenticated API Call)

```
HTTP Request
  │
  ▼
JwtAuthFilter.doFilterInternal()
  ├─ Extract "Bearer {token}" from Authorization header
  ├─ jwtService.extractUserId(token) → parse HMAC-SHA256 JWT
  ├─ userService.findById(userId) → DB query (users table)
  ├─ jwtService.extractShopId(token) → from JWT claims (NO DB query)
  └─ Set SecurityContext with UserPrincipal (userId, role, shopId, authorities)
  │
  ▼
SecurityConfig.filterChain authorization check
  ├─ /api/v1/auth/** → permitAll
  ├─ /api/v1/owner/** → hasRole("OWNER")
  └─ everything else → authenticated
  │
  ▼
Controller layer (e.g., OrderController)
  ├─ Extract UserPrincipal via SecurityUtils.getCurrentUser()
  ├─ Validate request body via Bean Validation (@Valid)
  └─ Delegate to Service layer
  │
  ▼
Service layer (e.g., OrderService)
  ├─ Business logic execution
  ├─ Repository calls (JPA/JPQL)
  └─ Return domain entity
  │
  ▼
Controller wraps in ApiResponse<T> or PageResponse<T>
  │
  ▼
HTTP Response (JSON, application/json)
```

## Authentication Flow (Login)

```
Browser → Firebase SDK → Google OAuth → Firebase ID Token (short-lived)
  │
  ▼
POST /api/v1/auth/verify  { firebaseToken: "..." }
  │
  ▼
FirebaseTokenVerifier.verify()
  ├─ FirebaseAuth.getInstance().verifyIdToken(token)
  └─ Returns FirebaseToken with uid, email, name, picture
  │
  ▼
UserService.findOrCreate(firebaseToken)
  ├─ findByFirebaseUid() → if exists, return existing user
  └─ If new: create User(firebaseUid, email, name, avatarUrl, role=CUSTOMER)
  │
  ▼
ShopService.getShopIdByOwnerId() → null if CUSTOMER, UUID if OWNER
   │
   ▼
JwtService.generateAccessToken(user, shopId)
   ├─ Claims: sub=userId, email, role, shopId
   └─ Expires: 3600 seconds (1 hour)
   │
   ▼
Response: { accessToken, refreshToken, expiresIn:3600, user:{...} }

✅ Refresh token is returned from auth controller; frontend stores it in localStorage
   Via Zustand auth.store → persists under `printflow_auth` key
   Axios response interceptor catches 401 → calls POST /api/v1/auth/refresh → retries original request
```

## Order Creation Flow (Customer)

```
1. Customer uploads file: POST /api/v1/uploads/sign
   → CloudinaryService generates signed upload params (60s TTL)
   → Client uploads directly to Cloudinary CDN (backend never handles the file)
   → Client receives Cloudinary URL

2. POST /api/v1/orders { shopId, documents:[{fileUrl, printConfig}], urgency, expectedDelivery }
   → ShopService.getShopById() — validates shop exists and is OPEN
   → ShopService.getPriceConfig(shopId) — loads pricing
   → OrderNumberGenerator.generate() — PostgreSQL sequence → "PF-2026-00001"
   → Per-document: PriceCalculationService.calculateDocumentPrice()
      formula: (baseRate × pages × copies) + binding_flat + lamination_per_page
   → PriceCalculationService.calculateUrgencyFee() — HIGH: flat fee, CRITICAL: higher flat fee
   → Order.totalAmount = sum(documents) + urgencyFee
   → orderRepository.save() — cascade saves OrderDocuments
   → notificationService.notifyNewOrderToOwner() — @Async, fires email + in-app notification
```

## Order Status FSM

```
PENDING ──────────────► ACCEPTED ──────────────► IN_PROGRESS ──► COMPLETED (terminal)
    │                      │    │                     │
    │                      │    └──► WAITING_CLARIF ──┘ (back to ACCEPTED)
    │                      │              │
    └──────────────────────┴──────────────┴──► CANCELLED (terminal)
                           │
                           └──► DELAYED ──► IN_PROGRESS
                                           │
                                           └──► CANCELLED
```

- `ACCEPTED` sets `lockExpiresAt = now + 5min` (intent: prevent double-accept race)
- `IN_PROGRESS` sets `processingStartedAt`
- `DELAYED` requires `delayReason` + `delayUntil`
- `CANCELLED` requires `note` (cancellation reason)
- Every transition is recorded in `order_status_history` table

## Notification Dispatch Flow (Async)

```
OrderStatusService.updateStatus() completes
  │
  ▼
notificationService.notifyOrderStatusChange(order, newStatus)  ← @Async("notificationExecutor")
  ├─ Runs on dedicated thread pool (core=5, max=20)
  ├─ Resolves template based on OrderStatus enum switch
  ├─ Substitutes {{vars}} in template
  ├─ emailService.send() → Gmail SMTP
  ├─ WhatsAppService.send() → Twilio API (Message.creator)
  ├─ SmsService.send() → Twilio API (Message.creator)
  └─ save IN_APP notification to DB (always)
```

## Background Jobs / Workers
**None currently active.** `@EnableAsync` is present, but it's used only for `notificationExecutor`.
There are no `@Scheduled` jobs, no message queues (Kafka/RabbitMQ), and no webhooks.

## Frontend Request Lifecycle (React)

```
User action → React Hook (useOrders, useOwnerQueue)
  │
  ▼
React Query: useQuery/useMutation → service function
  │
  ▼
Axios instance (api.ts)
  ├─ Request interceptor: reads accessToken from Zustand store → adds Authorization header
  └─ Response interceptor: 401 → call useAuthStore.getState().setTokens() → retry original request
                                   → if refresh fails → call useAuthStore.getState().logout()
  │
  ▼
Backend REST API → Response
  │
  ▼
React Query caches response → component re-renders
  └─ ORDER_POLL_INTERVAL = 30s for order detail (polling, not WebSockets)
  └─ NOTIFICATION_POLL_INTERVAL = 60s
```

## Deployment (Docker)

```
printflow-backend/Dockerfile:
  FROM eclipse-temurin:21-jre-alpine
  COPY target/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "app.jar"]

No docker-compose.yml in backend (only references in master docs).
Frontend: Vite SPA — built to /dist, served as static assets (no SSR).
```
