# Admin Auth & Market Monitoring — Design Spec

## Overview

Add wallet-based authentication, role-based access control, and an admin market monitoring dashboard to the Cournot Dashboard. Admins can add markets for monitoring, receive Lark alerts when resolution signals are detected, trigger Proof of Reasoning, and confirm resolutions that get broadcast to Lark and Telegram.

**Scope:** Frontend changes only in this repo. Backend receives an API spec to implement on the existing `interface.cournot.ai` service.

## Architecture

```
Browser (Next.js 14)
├── EVM Wallet (MetaMask via wagmi v2 + viem)
├── AuthContext (JWT + role in localStorage)
├── Existing pages: /cases, /playground, /monitoring, /developer
└── NEW: /admin/markets (role-gated)
        ├── List view with filters
        ├── Add market form
        └── Detail + resolution workflow

Next.js API Proxy (/api/proxy/[...path])
├── Forwards Authorization: Bearer header
└── Proxies to UPSTREAM_API_BASE

Cournot Backend (interface.cournot.ai)
├── NEW: /auth/* endpoints (challenge, verify, logout, me)
├── NEW: /admin/markets/* endpoints (CRUD + resolve)
├── EXISTING: /step/* oracle pipeline (reused for PoR)
├── Market monitor loop (existing mechanism)
├── Lark integration (alerts + resolution notices)
└── Telegram integration (resolution broadcast with evidence)
```

## 1. Authentication

### Flow

1. User clicks "Connect Wallet" in topbar
2. wagmi `useConnect()` triggers MetaMask popup, user approves, frontend gets address
3. Frontend calls `POST /auth/challenge` with address
4. Backend returns challenge message containing nonce + timestamp (expires in 300s)
5. wagmi `useSignMessage()` triggers MetaMask sign popup, user signs
6. Frontend calls `POST /auth/verify` with address, signature, and challenge
7. Backend recovers address via `ecrecover`, verifies nonce/timestamp, looks up role, returns JWT
8. Frontend stores token, address, role in `AuthContext` + localStorage
9. All subsequent API calls include `Authorization: Bearer {jwt}` header

### Auth API

#### POST /auth/challenge

Request a challenge message for wallet signature.

**Request:**
```json
{ "address": "0xABC..." }
```

**Response:**
```json
{
  "challenge": "Sign this message to login to Cournot Dashboard\nNonce: a1b2c3\nTimestamp: 2026-03-13T12:00:00Z\nExpires: 300s",
  "expires_at": "2026-03-13T12:05:00Z"
}
```

#### POST /auth/verify

Submit signed challenge. Backend recovers address, verifies nonce, returns JWT + role.

**Request:**
```json
{
  "address": "0xABC...",
  "signature": "0x123...",
  "challenge": "Sign this message..."
}
```

**Response:**
```json
{
  "token": "eyJhbG...",
  "address": "0xABC...",
  "role": "admin" | "user",
  "expires_at": "2026-03-14T12:00:00Z"
}
```

#### GET /auth/me

Validate existing JWT and return current session. Used on page reload.

**Header:** `Authorization: Bearer eyJhbG...`

**Response:**
```json
{
  "address": "0xABC...",
  "role": "admin" | "user",
  "expires_at": "2026-03-14T12:00:00Z"
}
```

#### POST /auth/logout

Invalidate JWT server-side. Frontend also clears localStorage and disconnects wallet.

**Header:** `Authorization: Bearer eyJhbG...`

**Response:**
```json
{ "ok": true }
```

### Frontend Auth State

```typescript
// AuthContext provides:
interface AuthState {
  isConnected: boolean;      // wagmi wallet connected
  isAuthenticated: boolean;  // JWT token valid
  address: string | null;
  role: "admin" | "user" | null;
  token: string | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// localStorage keys:
// "cournot_auth_token"   — JWT string
// "cournot_auth_address" — address for display
// "cournot_auth_role"    — role for quick UI checks
```

**Page load restoration:** Check localStorage for token → `GET /auth/me` to validate → restore or clear.

### Test Mode

When `NEXT_PUBLIC_ENABLE_TEST_AUTH=true`:
- "Connect Wallet" bypasses MetaMask entirely
- Auto-sets address to `0xTEST...1234`
- Skips challenge/signature flow
- Calls `/auth/verify` with a special test signature
- Backend recognizes test mode and returns admin JWT
- All subsequent API calls work normally with the test JWT

## 2. Admin Market Management

### Data Model

```typescript
interface AdminMarket {
  id: string;                    // server-generated UUID
  title: string;                 // "Will BTC hit $100k by June 2026?"
  platform: string;              // "polymarket" | "kalshi" | "limitless" | "custom"
  platform_url: string | null;   // link to market on platform
  description: string;           // detailed market description
  question: string;              // resolvable question (fed to PoR)

  start_time: string;            // ISO 8601
  end_time: string;              // ISO 8601
  resolve_time: string;          // ISO 8601

  status: MarketStatus;
  alert_level: AlertLevel;
  alert_reason: string | null;

  resolution: Resolution | null; // null until resolved
  por_result: RunSummary | null; // raw PoR result if triggered

  created_by: string;            // admin address
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}

type MarketStatus = "ACTIVE" | "MONITORING" | "ALERTED" | "RESOLVING" | "RESOLVED" | "EXPIRED";
type AlertLevel = "none" | "low" | "medium" | "high" | "critical";

interface Resolution {
  outcome: string;               // "YES" | "NO" | "INVALID" | custom
  confidence: number;            // 0-1
  resolved_by: string;           // admin address
  resolved_at: string;           // ISO 8601
  method: "por" | "manual" | "por_modified";
  por_root: string | null;
  admin_notes: string | null;
  evidence_summary: string | null;
}
```

### Status Lifecycle

```
ACTIVE → MONITORING → ALERTED → RESOLVING → RESOLVED
  (added)   (after       (signal    (admin      (confirmed)
             start_time)  detected)  reviewing)

                                               → EXPIRED
                                          (past resolve_time, no resolution)
```

### Admin API

All admin endpoints require `Authorization: Bearer {jwt}` with role = "admin".

#### GET /admin/markets

List markets with filtering and pagination.

**Query params:**
- `status` — comma-separated: `ALERTED,MONITORING`
- `alert_level` — comma-separated: `high,critical`
- `platform` — single value: `polymarket`
- `page` — default 1
- `page_size` — default 20
- `sort` — field name: `resolve_time`
- `order` — `asc` | `desc`

**Response:**
```json
{
  "markets": [AdminMarket],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

#### POST /admin/markets

Add a new market to be monitored.

**Request:**
```json
{
  "title": "Will BTC hit $100k by June 2026?",
  "platform": "polymarket",
  "platform_url": "https://polymarket.com/...",
  "description": "Bitcoin must reach or exceed...",
  "question": "Will Bitcoin reach $100,000...",
  "start_time": "2026-03-13T00:00:00Z",
  "end_time": "2026-06-30T23:59:59Z",
  "resolve_time": "2026-07-01T00:00:00Z"
}
```

**Response (201):**
```json
{ "market": AdminMarket }
```

#### GET /admin/markets/:id

Get full market detail including alert info and PoR result.

**Response:**
```json
{ "market": AdminMarket }
```

#### PUT /admin/markets/:id

Update market metadata. Cannot update once status is RESOLVED.

**Request:** Partial `AdminMarket` fields.

**Response:**
```json
{ "market": AdminMarket }
```

#### POST /admin/markets/:id/resolve

Submit final resolution. Triggers Lark notification + Telegram broadcast.

**Request:**
```json
{
  "outcome": "YES",
  "confidence": 0.95,
  "method": "por_modified",
  "por_root": "abc123...",
  "admin_notes": "PoR said NO but official source confirms YES",
  "evidence_summary": "Reuters reported on 2026-03-13..."
}
```

**Response:**
```json
{
  "market": AdminMarket,
  "notifications": {
    "lark": true,
    "telegram": true
  }
}
```

**Backend side-effects:**
- Sets market status to RESOLVED
- Sends Lark message: "Market [title] resolved as [outcome] by [address]"
- Sends Telegram message to designated group with full evidence + proofs

### Error Responses

Standard error envelope matching existing pattern:

```json
{
  "code": 4xxx,
  "msg": "Human-readable error",
  "data": null
}
```

| Code | Meaning |
|------|---------|
| 4000 | Bad request (validation error) |
| 4010 | Unauthorized (no token or expired) |
| 4030 | Forbidden (valid token but not admin) |
| 4040 | Not found |
| 4090 | Conflict (market already resolved) |
| 5000 | Internal server error |

## 3. UI Design

### Topbar Changes

- Replace placeholder user menu with wallet connect button
- **Not connected:** Purple "Connect Wallet" button
- **Connected:** Green dot + truncated address (`0xABC...1234`) + role badge (ADMIN in red) + "Disconnect" button

### Sidebar Changes

- Admin section appears conditionally when `role === "admin"`
- New items under "Admin" heading: "Market Monitor" (`/admin/markets`), "+ Add Market" (`/admin/markets/new`)
- Admin items styled in red/accent color to distinguish from regular nav

### Admin Pages

#### Market List (`/admin/markets`)
- Header with title + "Add Market" button
- Status filter tabs: Alerted (count) | Monitoring | Active | Resolved | All
- Platform dropdown filter
- Table columns: Title, Platform (badge), Status, Alert Level, Resolve By, Actions (View / Resolve)
- Alerted rows highlighted with subtle red background
- Pagination at bottom

#### Add Market (`/admin/markets/new`)
- Form with fields: Title, Platform (dropdown), Platform URL, Question, Description, Start Time, End Time, Resolve Time
- All times in ISO 8601 format
- Submit → `POST /admin/markets` → redirect to list

#### Market Detail (`/admin/markets/:id`)
- Breadcrumb: Admin → Market Monitor → [title]
- Market info card (title, description, platform badge, time grid)
- Alert reason box (red border, shown when ALERTED)
- Action buttons: "Run Proof of Reasoning" + "Check News Manually"
- PoR result section (appears after running): outcome, confidence, PoR root, collapsible evidence/reasoning (reuses existing playground detail components)
- Resolution confirmation form: outcome dropdown (pre-filled from PoR), confidence input, admin notes textarea, "Confirm & Notify" button

### Admin Layout Gate

`/admin/layout.tsx` checks auth state:
- Not authenticated → redirect to home
- Authenticated but not admin → show "Access Denied" message
- Admin → render children

## 4. PoR Integration

When admin clicks "Run Proof of Reasoning":

1. Frontend calls existing `/step/resolve` via proxy (same as playground single-call mode)
2. Shows loading state (reuse `pipeline-progress` component)
3. On success, displays `RunSummary` (reuse playground result components)
4. Pre-fills resolution form: outcome, confidence, por_root from `RunSummary`
5. If admin modifies outcome or confidence, method auto-changes from `"por"` to `"por_modified"`
6. Admin clicks "Confirm & Notify" → `POST /admin/markets/:id/resolve`

No new oracle API endpoints needed.

## 5. Notification Pipeline (Backend-Side)

### Lark Alert (on signal detection)
```
Market [title] may be resolvable.
Signal: [alert_reason]
Alert level: [HIGH/CRITICAL]
Dashboard: [url to /admin/markets/:id]
```

### Lark Resolution Notice
```
Market RESOLVED
Title: [title]
Outcome: [YES/NO/INVALID]
Confidence: [0.94]
Method: [por/manual/por_modified]
Resolved by: [0xABC...1234]
Time: [2026-03-13 15:00 UTC]
```

### Telegram Resolution Broadcast
```
Cournot Market Resolution
═══════════════════════
Market: [title]
Platform: [Polymarket]
Outcome: YES
Confidence: 94%

Evidence:
• [source 1] - [excerpt]
• [source 2] - [excerpt]

Reasoning:
[brief reasoning summary]

PoR Root: abc123...
Resolved by: 0xABC...1234
Method: por_modified
Admin notes: [if any]
```

Note: Lark and Telegram integrations are backend-only. Frontend only triggers via the `/admin/markets/:id/resolve` endpoint.

## 6. File Structure

### New Files

```
lib/
├── auth.ts                    # AuthContext, useAuth hook, login/logout logic
├── wagmi-config.ts            # wagmi client config (chains, connectors)
└── admin-api.ts               # Admin API client (markets CRUD, resolve)

app/
├── admin/
│   ├── layout.tsx             # Admin role gate
│   └── markets/
│       ├── page.tsx           # Market list view
│       ├── new/
│       │   └── page.tsx       # Add market form
│       └── [id]/
│           └── page.tsx       # Market detail + resolve

components/
├── auth/
│   ├── connect-button.tsx     # Wallet connect/disconnect in topbar
│   └── auth-provider.tsx      # WagmiProvider + AuthContext wrapper
└── admin/
    ├── market-table.tsx       # Market list table with filters
    ├── market-form.tsx        # Add/edit market form
    ├── market-detail.tsx      # Market info + alert display
    ├── por-trigger.tsx        # PoR run button + result display
    └── resolve-form.tsx       # Resolution confirmation form
```

### Modified Files

```
lib/types.ts                         # + AdminMarket, Resolution, AlertLevel types
app/layout.tsx                       # + wrap with WagmiProvider + AuthProvider
app/api/proxy/[...path]/route.ts     # + forward Authorization header
components/layout/sidebar.tsx        # + admin nav items (conditional)
components/layout/topbar.tsx         # + connect button (replace placeholder)
package.json                         # + wagmi, viem, @tanstack/react-query
.env.example                         # + NEXT_PUBLIC_ENABLE_TEST_AUTH, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

## 7. Environment Variables

```bash
# Existing
UPSTREAM_API_BASE=https://dev-interface.cournot.ai/play/polymarket
NEXT_PUBLIC_ENABLE_PLAYGROUND_LOCALHOST_MODE=false

# New
NEXT_PUBLIC_ENABLE_TEST_AUTH=false          # true → skip wallet, auto-admin login
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=      # WalletConnect v2 project ID (optional)
```

## 8. Dependencies

```
wagmi@^2           # React hooks for EVM wallets
viem@^2            # TypeScript EVM client (wagmi peer dep)
@tanstack/react-query@^5  # Async state management (wagmi peer dep)
```
