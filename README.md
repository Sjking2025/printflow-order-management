# PrintFlow — Digital Order Management System for Print Shops

A full-stack order management system for Xerox and print shops. Customers place print orders online with document configuration, upload files, and submit UPI payment proof. Shop owners manage the queue, track order status, verify payments, and communicate with customers.

## Tech Stack

### Backend
- **Java 21** + **Spring Boot 3.2.5**
- PostgreSQL 17 (via Neon DB)
- Flyway migrations
- Spring Security + JWT authentication
- Firebase Admin SDK (Google sign-in verification)
- Cloudinary (file uploads)
- Twilio (SMS notifications)
- Spring Mail (email notifications)

### Frontend
- **React 18** + **Vite 5** + **TypeScript**
- Tailwind CSS 3 (Material Design 3 color system)
- React Router 6
- TanStack Query 5 (server state)
- Zustand (client state)
- Firebase JS SDK (Google sign-in)
- Axios (HTTP client)
- qrcode.react (UPI QR generation)

## Features

### Customer
- Google sign-in
- Place orders with up to 5 documents
- Per-document configuration (copies, print type B&W/Color, side type, paper size A4/A3, binding, lamination)
- Real-time price calculator
- File upload with progress bars via Cloudinary signed URLs
- UPI payment QR code + UTR (transaction ID) entry
- Payment proof screenshot upload
- Order history and detail view
- Copy count modification within lock window
- Clarification thread with shop owner

### Shop Owner
- Google sign-in with role-based redirect
- Dashboard with stats (pending, urgent, in-progress, completed today, revenue)
- Priority-sorted queue (CRITICAL → HIGH → NORMAL)
- Order detail view with documents, payment info, customer info
- Order status transitions: PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
- Delay marking with reason and expected date
- Order cancellation
- Payment verification (accept/reject proof)
- Document preview (PDF first page as image) and download
- Price configuration (per-page rates, add-on prices, urgency fees)
- Shop closure mode
- UPI ID configuration

## Project Structure

```
printflow-backend/
├── src/main/java/com/printflow/
│   ├── auth/          # JWT filter, Firebase verification, security config
│   ├── common/        # Shared DTOs (ApiResponse, PageResponse), security principal
│   ├── orders/        # Orders, documents, status management, mappers
│   ├── payments/      # Payment proof submission, verification
│   ├── queue/         # Owner queue with urgency sorting
│   ├── shops/         # Shop settings, prices, public info, closure
│   ├── uploads/       # Cloudinary signed URL generation
│   ├── users/         # User management, repository
│   └── notifications/ # Email (Spring Mail) and SMS (Twilio)
├── src/main/resources/
│   ├── db/migration/  # Flyway migrations (V1–V13)
│   └── application.yml
├── pom.xml

printflow-frontend/
├── src/
│   ├── components/    # Reusable UI (Card, Badge, Modal, Spinner, etc.)
│   ├── hooks/         # Custom hooks (useOrders, useAuth, etc.)
│   ├── pages/
│   │   ├── auth/      # LoginPage (split-screen, role toggle)
│   │   ├── customer/  # OrderListPage, NewOrderPage, OrderDetailPage
│   │   └── owner/     # DashboardPage, QueuePage, OwnerOrderDetailPage, SettingsPage, etc.
│   ├── services/      # API clients (auth, orders, payments, shops, upload)
│   ├── store/         # Zustand stores (auth, shop)
│   ├── types/         # TypeScript interfaces
│   └── utils/         # Helpers (formatCurrency, formatDate)
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── package.json
```

## Getting Started

### Prerequisites
- Java 21
- Node.js 18+
- PostgreSQL (or Neon DB account)
- Firebase project (with Authentication and Admin SDK)
- Cloudinary account
- Twilio account (optional, for SMS)

### Backend Setup

1. **Clone and navigate:**
   ```bash
   cd printflow-backend
   ```

2. **Set up environment variables** in `.env`:
   ```env
   DATABASE_URL=jdbc:postgresql://<host>/<db>?sslmode=require
   DB_USERNAME=<user>
   DB_PASSWORD=<pass>
   FIREBASE_CREDENTIALS={"type":"service_account",...}
   CLOUDINARY_CLOUD_NAME=<name>
   CLOUDINARY_API_KEY=<key>
   CLOUDINARY_API_SECRET=<secret>
   CLOUDINARY_UPLOAD_FOLDER=orders
   TWILIO_ACCOUNT_SID=<sid>
   TWILIO_AUTH_TOKEN=<token>
   TWILIO_PHONE_NUMBER=<number>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=<email>
   SMTP_PASSWORD=<app-password>
   ```

3. **Run the backend:**
   ```bash
   .\start-dev.ps1    # Windows — loads .env and runs mvn spring-boot:run
   # or
   mvn spring-boot:run
   ```

   Backend starts on `http://localhost:8080`.

### Frontend Setup

1. **Navigate and install:**
   ```bash
   cd printflow-frontend
   npm install
   ```

2. **Set Firebase config** in `src/services/firebase.ts`:
   ```ts
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     // ...
   }
   ```

3. **Run the dev server:**
   ```bash
   npm run dev
   ```

   Frontend starts on `http://localhost:5173` — the Vite dev server proxies `/api` to `localhost:8080`.

## Database

PostgreSQL with Flyway migrations (13 migrations):

| Migration | Description |
|-----------|-------------|
| V1 | Initial schema: users, shops, orders, order_documents |
| V2 | Add payment_status to orders |
| V3 | Add price_config table |
| V4 | Add closure fields to shops |
| V5 | Add payment proof support |
| V6 | Add status history tracking |
| V7 | Add clarification threads |
| V8 | Add delay fields to orders |
| V9 | Add lock timer and processing time |
| V10 | Add urgency and delivery fields |
| V11 | Add notifications config |
| V12 | Add index optimizations |
| V13 | Add transaction_id to payments |

## API Endpoints

### Authentication
- `POST /api/v1/auth/verify` — Verify Firebase token, return JWT

### Orders (Customer)
- `POST /api/v1/orders` — Create order
- `GET /api/v1/orders` — List customer's orders (paginated)
- `GET /api/v1/orders/{id}` — Get order detail (with documents, payment, customer)
- `PATCH /api/v1/orders/{id}/documents/{docId}` — Update copy count

### Payments
- `POST /api/v1/payments/{orderId}/proof` — Submit payment proof (with UTR)
- `PATCH /api/v1/payments/{paymentId}/verify` — Verify/reject payment (owner)

### Owner
- `GET /api/v1/owner/dashboard` — Dashboard stats
- `GET /api/v1/owner/queue?status=...` — Queue with urgency sorting
- `GET /api/v1/owner/orders/{id}` — Order detail (owner view)
- `PATCH /api/v1/orders/{id}/status` — Update order status
- `GET /api/v1/owner/customers` — Customer list with stats
- `GET /api/v1/owner/shop` — Get owner's shop info
- `POST /api/v1/owner/closure` — Set closure mode

### Shops
- `GET /api/v1/shops/public` — Public shop list
- `GET /api/v1/shops/{id}/prices` — Get price config
- `PATCH /api/v1/shops/{id}/prices` — Update prices
- `PATCH /api/v1/shops/{id}/settings` — Update settings (lock timer, UPI)

### Uploads
- `POST /api/v1/uploads/sign` — Get signed Cloudinary upload URL

## Color System (Material Design 3)

| Token | Value |
|-------|-------|
| Primary | `#001e40` |
| Secondary Container (CTAs) | `#fe6b00` |
| Surface | `#f7f9fb` |
| Font | Inter |

## License

MIT
