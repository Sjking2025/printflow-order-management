# Project Intelligence Brief
Generated: 2026-05-26
Project: PrintFlow
Analyzed Commit: 18d5449 (ui-redesign, 9 ahead of main)

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
uses Cloudinary CDN with client-side direct upload. Notifications use Gmail SMTP + Twilio API
(WhatsApp + SMS) + in-app notifications. Auth tokens are persisted to localStorage and auto-refreshed.

## Tech Stack
- **Runtime:** Java 21 (Spring Boot 3.2.5) + Node.js (Vite dev server)
- **Backend Framework:** Spring Boot (Web, Security, JPA, Validation, Mail, Actuator)
- **Database:** PostgreSQL via Spring Data JPA (Hibernate) + Flyway (V1–V11 migrations)
- **Frontend Framework:** React 18.3 + TypeScript 5.4 + Vite 5.3
- **State Management:** Zustand (client/auth state) + TanStack React Query v5 (server state)
- **Auth:** Firebase Auth (Google OAuth) → HMAC-SHA256 JWT (JJWT 0.12.5)
- **File Storage:** Cloudinary (signed URL, client-side upload)
- **Notifications:** Gmail SMTP (wired) + Twilio WhatsApp/SMS (both wired via `Message.creator()`)
- **Auth Persistence:** localStorage via Zustand; auto-refresh via Axios 401 interceptor
- **Styling:** Tailwind CSS 3.4 with custom design tokens
- **Key Libraries:** MapStruct (declared, unused), Lombok, Zod, react-hook-form, date-fns
- **Infrastructure:** Docker (backend only), no CI/CD detected

## Architecture in 3 Sentences

PrintFlow is a **modular monolith** organized by domain (auth, orders, payments, notifications, clarifications, queue, shops, uploads, users) with a shared common infrastructure layer — each package is self-contained with its own controller/service/repository. The backend owns all business logic including the server-side price calculator, a strict 7-state order FSM, and an async notification dispatcher (email + WhatsApp + SMS + in-app), while the frontend's role is UI + form management + polling (30s intervals, no WebSockets). Authentication is a Firebase→JWT bridge: clients authenticate via Firebase Google OAuth, then exchange the Firebase ID token for an internal short-lived JWT (1h, with working refresh via Axios 401 interceptor) that carries userId, role, and shopId claims.

## Key Modules
- `backend/auth/` → Firebase token verification + internal JWT issuance
- `backend/orders/` → Core domain: order lifecycle, FSM, pricing, document management
- `backend/payments/` → Manual payment proof upload + owner verification
- `backend/notifications/` → Async multi-channel notifications (email + WhatsApp + SMS + in-app; all wired)
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
| `OrderStatusHistory` | Audit trail per transition | orderId, fromStatus, toStatus, changedBy, note ✅ persisted via repository |
| `Payment` | Payment proof + verification | orderId, amount, proofUrl, method, status (PENDING/PROOF_UPLOADED/VERIFIED/REJECTED), verifiedBy |
| `ClarificationThread` | Per-order message thread | orderId, senderId, senderRole, message, isRead |
| `Notification` | Notification log | userId, orderId, type, channel (EMAIL/WHATSAPP/SMS/IN_APP), status |

## Active Development Areas
Based on codebase state: the project is in **pre-deployment** stage. The entire MVP feature set is
functionally complete — all 11 items from the implementation plan have been verified working:
OrderStatusHistory persistence, Firebase key gitignored, refresh token, completedToday stat,
order lock timer enforcement, UPI ID field, ClarificationDrawer chat UI, NotificationsPage + header
badge, notification triggers, JWT filter optimization, and Twilio WhatsApp/SMS dispatch.

## Previously Known Risks — All Resolved
1. ✅ Firebase credentials — `.gitignore` added, file untracked
2. ✅ OrderStatusHistory — now persisted via `historyRepository.save()`
3. ✅ Refresh token — Axios interceptor calls `/auth/refresh`
4. ✅ Order lock timer — enforced in transition validation
5. ✅ JWT filter — `shopId` read from claims, no extra DB query
6. ✅ Twilio — both WhatsApp and SMS dispatch via API
7. ❌ **No rate limiting** — upload signing endpoint still abusable (remaining)

## Engineering Signals

**Code Quality: Mid-stage startup, high consistency, clean architecture intent**
The codebase shows a developer with strong Spring Boot fundamentals: constructor injection (no `@Autowired`), proper `@Transactional` boundaries, Bean Validation, `@PreUpdate` hooks, custom `@Async` executor, JPQL with `@Param`. The package-by-feature structure (`com.printflow.orders.*`, `com.printflow.auth.*`) is correct and consistent. The `OrderStatusTransitions` FSM is particularly well-designed — immutable `Map.of()`, separate validate/isValid methods, pure logic.

**Where quality has improved:** The previously messy code in `OrderStatusService` (dead `Optional.get().get()` block) has been cleaned up. The critical `OrderStatusHistory` save bug was fixed. All known MVP shortcuts have been addressed — JWT filter optimized, Twilio wired, refresh token working, Firebase key secured.

**Trajectory:** Strong. The codebase has moved from "late MVP with known critical bugs" to "pre-deployment, all features complete". The developer has systematically addressed every item from the implementation plan. Next logical steps: deployment, hardening (rate limiting, ownership checks), and real-time features (WebSockets).

## How to Orient a New Claude Session
```
Read: .project-memory/ai-context/compressed-context.md
Then: .project-memory/risks/tech-debt.md  (all critical items resolved)
Then: .project-memory/roadmap/next-steps.md
Ask: "What are we working on today?"
```

Note: All previously critical bugs (history not persisted, Firebase key exposure, no refresh token, no Twilio, JWT inefficiency) are now fixed. See `sessions/2026-05-26-session.md` for the verification log.
