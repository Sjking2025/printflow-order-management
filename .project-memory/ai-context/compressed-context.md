# PrintFlow — Compressed Context
2026-05-21 | HEAD

PrintFlow is a **digital order management SaaS for Indian Xerox/print shops** replacing WhatsApp+cash workflows with a structured real-time pipeline for customers (upload, configure, track) and shop owners (priority queue, payment verification, status management).

**Stack:** Java 21 / Spring Boot 3.2.5 + React 18 / Vite 5 / TypeScript + PostgreSQL + Flyway + Firebase Auth (Google OAuth) + Cloudinary CDN + Gmail SMTP + Zustand + TanStack Query + Tailwind CSS

**Architecture:** Two-service full-stack (Spring Boot REST API + Vite SPA). Backend is a modular monolith organized by domain package. Auth: Firebase → internal HMAC-SHA256 JWT (1h, broken refresh). Files: Cloudinary signed-URL, client-side direct upload. Notifications: async thread pool (email wired, Twilio declared but NOT wired). DB schema: V1-V11 Flyway migrations (10 tables).

**Modules:** auth=Firebase→JWT bridge | orders=core FSM + pricing | payments=UPI proof workflow | notifications=async multi-channel | clarifications=per-order messaging | queue=owner priority view | shops=config+pricing | uploads=Cloudinary sign | users=Firebase sync

**Active features:** Google OAuth login, place order (multi-doc, auto-pricing), Cloudinary upload, order FSM (7 states), priority queue, owner status management, payment proof+verify, clarification threads, email notifications, in-app notifications, shop open/close, price config, shop settings, order number generation (PF-YYYY-NNNNN)

**In progress / stubs:** refresh token (returns 401), Twilio WhatsApp/SMS (records to DB only), order lock enforcement (set but not checked), frontend notifications UI

**Critical bugs:** OrderStatusHistory never persisted (audit trail broken) | Firebase creds committed to repo root | completedToday stat counts all-time not today | per-request DB re-query in JWT filter

**Top risks:** Firebase key in repo (security) | status history broken (data integrity) | no refresh token (UX) | no rate limiting (abuse) | ownership checks missing on clarification/notification endpoints

**Next recommended work:**
1. Fix `OrderStatusService.java:73` — add `historyRepository.save(history)` (30 min)
2. Rotate Firebase service account key + add to `.gitignore` (1 hour)
3. Fix `QueueService.java:51` — filter `completedToday` by date (20 min)
