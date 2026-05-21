# Dependency Graph & Risk Classification
Last Updated: 2026-05-21

## Backend Dependencies (Spring Boot 3.2 / Java 21)

| Dependency | Version | Role | Risk |
|-----------|---------|------|------|
| `spring-boot-starter-web` | 3.2.5 | HTTP server, REST API | 🔵 Architecture-critical |
| `spring-boot-starter-security` | 3.2.5 | Filter chain, auth guards | 🔵 Architecture-critical |
| `spring-boot-starter-data-jpa` | 3.2.5 | JPA/Hibernate ORM | 🔵 Architecture-critical |
| `spring-boot-starter-validation` | 3.2.5 | Bean Validation (@Valid) | 🔵 Architecture-critical |
| `spring-boot-starter-mail` | 3.2.5 | Gmail SMTP email | 🔵 Architecture-critical |
| `spring-boot-starter-actuator` | 3.2.5 | `/actuator/health` endpoint | 🟡 Ops convenience |
| `postgresql` | managed | JDBC driver | 🔵 Architecture-critical |
| `flyway-core` | managed | DB schema migrations V1-V11 | 🔵 Architecture-critical |
| `lombok` | managed | Code generation (@Getter/@Builder) | 🟡 Heavy — annotation processor |
| `mapstruct` | 1.5.5.Final | Entity↔DTO mapping | 🟡 Heavy — build-time code gen |
| `jjwt-api` + `jjwt-impl` + `jjwt-jackson` | 0.12.5 | JWT signing/verification | 🔵 Architecture-critical |
| `firebase-admin` | 9.3.0 | Firebase ID token verification | 🔵 Architecture-critical |
| `cloudinary-http44` | 1.38.0 | Signed upload URL generation | 🔵 Architecture-critical |
| `twilio` | 10.4.1 | WhatsApp/SMS (declared but NOT wired) | 🟢 Dead (declared, unused in practice) |

## Frontend Dependencies (Vite 5 / React 18 / TypeScript 5)

| Dependency | Version | Role | Risk |
|-----------|---------|------|------|
| `react` + `react-dom` | 18.3.1 | UI framework | 🔵 Architecture-critical |
| `react-router-dom` | 6.23.1 | Client-side routing | 🔵 Architecture-critical |
| `axios` | 1.7.2 | HTTP client with interceptors | 🔵 Architecture-critical |
| `@tanstack/react-query` | 5.45.0 | Server state management + caching + polling | 🔵 Architecture-critical |
| `react-hook-form` | 7.51.5 | Form state management (order creation) | 🔵 Architecture-critical |
| `zod` | 3.23.8 | Schema validation for forms | 🔵 Architecture-critical |
| `@hookform/resolvers` | 3.6.0 | Zod ↔ react-hook-form bridge | 🔵 Architecture-critical |
| `zustand` | 4.5.2 | Client state (auth token, user) | 🔵 Architecture-critical |
| `firebase` | 10.12.2 | Google OAuth SDK | 🔵 Architecture-critical |
| `date-fns` | 3.6.0 | Date formatting utilities | 🟡 Medium |
| `date-fns-tz` | 3.1.3 | Timezone handling (IST) | 🟡 Medium |
| `tailwindcss` | 3.4.4 | Utility-first CSS | 🔵 Architecture-critical |

## Risk Notes

### 🟢 Dead: `twilio` (backend)
Twilio SDK is declared in `pom.xml` and configured in `application.yml` and `.env`. `NotificationService`
saves WhatsApp and SMS entries to the DB and has `shouldSendWhatsApp()` / `shouldSendSms()` methods,
but there is **no actual Twilio API call anywhere in the codebase**. The notification is only persisted
to the `notifications` table. Removing Twilio would save ~15MB of JAR size but requires no code changes
to existing flows — just cleanup.

### 🟡 Heavy: `mapstruct`
MapStruct is declared as a dependency with its annotation processor. However, reviewing the source,
`OrderMapper.java` and `UserMapper.java` exist but are implemented as simple hand-coded methods, not
MapStruct `@Mapper` interfaces. This suggests MapStruct was planned for use but the team defaulted
to manual mapping. The dependency adds build complexity without benefit.

### 🔵 Architecture-Critical: `flyway-core`
All 11 migrations are in sequence. DO NOT modify existing migration files — Flyway will detect
the checksum change and refuse to start. Always add new migrations as V12, V13, etc.

### 🟡 Medium: `firebase-admin` (large SDK)
Firebase Admin bundles Netty, gRPC, and Guava. It adds significant JAR weight. If you ever swap
to a different auth provider, this is a significant cleanup. The JWT bridge pattern means the
frontend Firebase SDK is also tied to Google — switching would require both sides.
