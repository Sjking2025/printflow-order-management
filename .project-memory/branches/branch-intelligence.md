# Branch Intelligence
Last Updated: 2026-05-26

## Currently Active Branch
**Name:** ui-redesign
**Created from:** main
**Purpose:** UI redesign and all MVP bug fixes — all 11 implementation plan items completed
**Status:** ✅ Ready for merge to main — all MVP features verified working
**Commits ahead of main:** 9

## Branch Inventory

| Branch | Last Activity | Purpose | Status |
|--------|--------------|---------|--------|
| main | 2026-05-26 | Production baseline (old, outdated) | 🟡 Out of date |
| ui-redesign | 2026-05-26 | UI redesign + all MVP fixes | ✅ Ready to merge (9 commits ahead) |

## All Changes on ui-redesign (Complete List)
- Full MD3 color system + responsive layouts (16-phase UI redesign)
- Payment flow: dynamic UPI QR, UTR input, StatusTimeline
- OrderResponse DTO now populates documents/payment/customer info
- SettingsPage uses real shop ID from backend
- PDF preview via Cloudinary JPG conversion, download via fetch+blob
- Auth persistence via localStorage
- Refresh token wired (Axios 401 interceptor)
- All `Map.of()` NPEs fixed; `@Transactional` added to prevent LazyInitializationExceptions
- Owner dashboard: customers tab, real queue data, fixed navigation
- `ShopPublicResponse` fixed to include `upiId` and `qrCodeUrl`
- OrderStatusHistory persistence (via `OrderHistoryListener`)
- Firebase key gitignored
- completedToday stat fixed (date-filtered JPQL)
- JWT filter optimization (shopId from claims)
- ClarificationService routes through FSM
- Twilio WhatsApp/SMS dispatch wired
- NotificationsPage + header unread badge
- ClarificationDrawer chat UI (full sliding drawer with quick replies)

## Merge Recommendation
`ui-redesign` is ready to merge into `main`. All 11 implementation plan items are complete.
No known regressions on `main` that need porting back.
