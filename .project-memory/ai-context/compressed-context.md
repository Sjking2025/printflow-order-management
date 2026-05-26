# PrintFlow — Compressed Context
2026-05-26 | 18d5449 (ui-redesign, 9 ahead of main)

PrintFlow is a **digital order management SaaS for Indian Xerox/print shops** replacing WhatsApp+cash workflows with a structured real-time pipeline for customers (upload, configure, track) and shop owners (priority queue, payment verification, status management).

**Stack:** Java 21 / Spring Boot 3.2.5 + React 18 / Vite 5 / TypeScript + PostgreSQL + Flyway + Firebase Auth (Google OAuth) + Cloudinary CDN + Gmail SMTP + Twilio + Zustand + TanStack Query + Tailwind CSS

**Architecture:** Two-service full-stack (Spring Boot REST API + Vite SPA). Backend is a modular monolith organized by domain package. Auth: Firebase → internal HMAC-SHA256 JWT (1h, refresh token wired on frontend Axios interceptor). Files: Cloudinary signed-URL, client-side direct upload. Notifications: async thread pool (email + Twilio WhatsApp/SMS + in-app all wired). DB schema: V1-V13 Flyway migrations.

**Modules:** auth=Firebase→JWT bridge | orders=core FSM + pricing | payments=UPI proof workflow | notifications=async multi-channel | clarifications=per-order messaging | queue=owner priority view | shops=config+pricing | uploads=Cloudinary sign | users=Firebase sync

**Active features:** Google OAuth login, place order (multi-doc, auto-pricing), Cloudinary upload, order FSM (7 states), priority queue, owner status management, payment proof+verify, clarification threads, email + WhatsApp + SMS + in-app notifications, shop open/close, price config, shop settings, order number generation (PF-YYYY-NNNNN), auth persistence (localStorage), refresh token (401 interceptor), PDF preview/download, receipt with UPI transaction ID

**Recently fixed:** Order detail pages now show documents/payment/customer info; SettingsPage uses real shop ID; PDF preview+download working; auth persists across refresh; `Map.of()` NPE fixed in 3 controllers; `@Transactional` added to 3 controllers; OwnerOrderDetailPage 500 fixed (DTO instead of entity)

**In progress / stubs:** WebSockets (planned for real-time queue updates), rate limiting (not yet implemented)

**Critical bugs:** ✅ All original critical bugs fixed — OrderStatusHistory persists, Firebase key gitignored, refresh token wired, JWT filter optimized (reads shopId from claims)

**Top risks:** No rate limiting (abuse — upload signing endpoint) | ownership checks missing on clarification/notification endpoints | no multi-shop support | single-shop assumption in ShopService

**Next recommended work:**
1. Deploy backend to Render + frontend to Vercel
2. Add ownership checks on clarification/notification endpoints
3. Add rate limiting (starting with upload signing endpoint)
4. Consider WebSockets for real-time queue updates
