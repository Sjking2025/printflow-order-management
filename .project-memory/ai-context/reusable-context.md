# Project Intelligence Brief
Generated: 2026-05-21
Project: PrintFlow
Analyzed Commit: HEAD

## What This Project Does

PrintFlow is a **digital order management platform for Xerox/print shops in India**. It replaces the
informal "send files via WhatsApp → pay cash → hope for the best" workflow with a structured system:
customers browse the shop, upload documents with print specifications (BW/color, A4/A3, binding,
lamination, urgency), get an instant price quote, and track their order in real time. Shop owners
receive a priority-sorted queue of orders, manage the print workflow through a 7-state FSM, verify
UPI payments via proof screenshots, and communicate with customers through per-order clarification threads.

Technically, PrintFlow is a two-service full-stack application targeting Indian small-business print
shops (single-owner, single-location). The backend is a Spring Boot 3.2 REST API (Java 21) with a
PostgreSQL database managed by Flyway migrations. The frontend is a Vite + React 18 + TypeScript SPA
with Tailwind CSS. Authentication is Firebase Google OAuth, bridged to internal JWTs. File storage
uses Cloudinary CDN with client-side direct upload. Email notifications use Gmail SMTP.

## Tech Stack
- **Runtime:** Java 21 (Spring Boot 3.2.5) + Node.js (Vite dev server)
- **Backend Framework:** Spring Boot (Web, Security, JPA, Validation, Mail, Actuator)
- **Database:** PostgreSQL via Spring Data JPA (Hibernate) + Flyway (V1–V11 migrations)
- **Frontend Framework:** React 18.3 + TypeScript 5.4 + Vite 5.3
- **State Management:** Zustand (client/auth state) + TanStack React Query v5 (server state)
- **Auth:** Firebase Auth (Google OAuth) → HMAC-SHA256 JWT (JJWT 0.12.5)
- **File Storage:** Cloudinary (signed URL, client-side upload)
- **Notifications:** Gmail SMTP (wired) + Twilio WhatsApp/SMS (declared, NOT wired)
- **Styling:** Tailwind CSS 3.4 with custom design tokens
- **Key Libraries:** MapStruct (declared, unused), Lombok, Zod, react-hook-form, date-fns
- **Infrastructure:** Docker (backend only), no CI/CD detected

## Architecture in 3 Sentences

PrintFlow is a **modular monolith** organized by domain (auth, orders, payments, notifications, clarifications, queue, shops, uploads, users) with a shared common infrastructure layer — each package is self-contained with its own controller/service/repository. The backend owns all business logic including the server-side price calculator, a strict 7-state order FSM, and an async notification dispatcher, while the frontend's role is UI + form management + polling (30s intervals, no WebSockets). Authentication is a Firebase→JWT bridge: clients authenticate via Firebase Google OAuth, then exchange the Firebase ID token for an internal short-lived JWT (1h, no working refresh) that carries userId, role, and shopId claims.

## Key Modules
- `backend/auth/` → Firebase token verification + internal JWT issuance
- `backend/orders/` → Core domain: order lifecycle, FSM, pricing, document management
- `backend/payments/` → Manual payment proof upload + owner verification
- `backend/notifications/` → Async multi-channel notifications (email + in-app; Twilio stubbed)
- `backend/clarifications/` → Per-order owner↔customer messaging
- `backend/queue/` → Priority queue view + dashboard stats for shop owners
- `backend/shops/` → Shop config, pricing rules, open/close, UPI/QR
- `backend/uploads/` → Cloudinary signed URL generation (stateless)
- `backend/users/` → Firebase UID → internal User entity sync
- `frontend/pages/customer/` → Order list, order detail, new order form
- `frontend/pages/owner/` → Dashboard, queue, order detail, settings, closure
- `frontend/store/` → Zustand auth store (accessToken, user, isAuthenticated)
- `frontend/hooks/` → React Query hooks wrapping API services

## Domain Entities

| Entity | Purpose | Key Fields |
|--------|---------|-----------|
| `User` | Firebase UID → internal identity | id (UUID), firebaseUid, email, role (CUSTOMER/OWNER), isActive |
| `Shop` | Print shop config | id, ownerId, name, isOpen, closureMode, lockTimerMins, upiId, qrCodeUrl |
| `PriceConfig` | Per-shop pricing rules | bwPerPageA4, colorPerPageA4, a3Multiplier, doubleSideDiscount, spiralBindingFlat, laminationPerPage, urgency fees |
| `Order` | Core business entity | id, orderNumber (PF-YYYY-NNNNN), status (FSM), urgency, totalAmount, paymentStatus, lockExpiresAt |
| `OrderDocument` | One doc per print job | fileUrl, pageCount, copies, printType, sideType, paperSize, binding, lamination, unitPrice, subtotal |
| `OrderStatusHistory` | Audit trail per transition | orderId, fromStatus, toStatus, changedBy, note ⚠️ BROKEN: never actually saved |
| `Payment` | Payment proof + verification | orderId, amount, proofUrl, method, status (PENDING/PROOF_UPLOADED/VERIFIED/REJECTED), verifiedBy |
| `ClarificationThread` | Per-order message thread | orderId, senderId, senderRole, message, isRead |
| `Notification` | Notification log | userId, orderId, type, channel (EMAIL/WHATSAPP/SMS/IN_APP), status |

## Active Development Areas
Based on codebase state: the project appears to be in **late MVP / pre-production** stage. The core
workflow (order creation → owner queue → status updates → notifications) is functionally complete.
Areas showing active/recent work: payment verification flow, clarification threading, shop closure
management, and Stitch UI mockups (suggesting active UI iteration).

## Known Risks
1. **Firebase credentials in repo** (`printflow-v2-firebase-adminsdk-fbsvc-546c915496.json`) — active security incident if repo is shared
2. **OrderStatusHistory not persisted** — silent bug; audit trail is broken in production
3. **Refresh token not implemented** — 1h forced re-login with no rotation
4. **Order lock timer not enforced** — concurrent ACCEPT race condition possible
5. **2 extra DB hits per authenticated request** — JWT filter re-queries what's already in the token
6. **Twilio not wired** — WhatsApp/SMS notifications silently fail (only DB-recorded)
7. **No rate limiting** — upload signing endpoint abusable

## Engineering Signals

**Code Quality: Mid-stage startup, high consistency, clean architecture intent**
The codebase shows a developer with strong Spring Boot fundamentals: constructor injection (no `@Autowired`), proper `@Transactional` boundaries, Bean Validation, `@PreUpdate` hooks, custom `@Async` executor, JPQL with `@Param`. The package-by-feature structure (`com.printflow.orders.*`, `com.printflow.auth.*`) is correct and consistent. The `OrderStatusTransitions` FSM is particularly well-designed — immutable `Map.of()`, separate validate/isValid methods, pure logic.

**Where quality drops:** The `OrderStatusService` has messy code (lines 39-46) that looks like hastily written "make it work" code that was never cleaned up. The critical bug of not saving `OrderStatusHistory` suggests the feature was implemented fast without testing the DB side. MapStruct being declared but unused is a planning artifact.

**Trajectory:** Positive. The codebase is getting cleaner over time (15 engineering docs, Stitch UI prototypes, Flyway migrations with a clear schema strategy). This is a developer who understands engineering discipline and is building toward it, with some MVP shortcuts still in the code.

## How to Orient a New Claude Session
```
Read: .project-memory/ai-context/compressed-context.md
Then: .project-memory/features/feature-baseline.md
Then: .project-memory/risks/tech-debt.md
Ask: "What are we working on today?"
```
