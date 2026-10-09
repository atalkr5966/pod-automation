# Security Architecture & Hardening Guide — POD Automation

## 1. Threat Model & Security Posture

POD Automation dispatches executive opening and closing tasks into corporate Slack workspaces. Hardening security across API routes, database access, and credentials is a critical requirement.

---

## 2. Zero Client Secret Exposure

### The Rules:
- **NEVER** expose Slack Bot tokens (`xoxb-...`) or Incoming Webhook URLs to client code.
- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to client code.
- **NEVER** prefix sensitive secrets with `NEXT_PUBLIC_`.

### Implementation:
- Webhooks and Bot tokens are configured via `/api/slack` and stored exclusively in the database or server environment variables.
- The UI only receives masked strings (e.g. `https://hooks.slack.com/services/...****` and boolean flags `hasBotToken: true`).
- The client cannot query Slack credentials directly.

---

## 3. Authentication & Password Security

### Password Hashing (PBKDF2)
Passwords are never stored in plaintext. They are protected using:
- **Algorithm**: PBKDF2 (Password-Based Key Derivation Function 2)
- **Iterations**: 100,000 rounds
- **Digest**: SHA-512
- **Key Length**: 64 bytes
- **Salt**: 16-byte cryptographically secure random bytes generated per user (`crypto.randomBytes(16)`)
- **Comparison**: `crypto.timingSafeEqual` prevents timing attack vulnerabilities.

### Brute-Force Rate Limiting
Authentication attempts are throttled by client IP and email:
- Maximum **5 failed attempts** per **15-minute window**.
- Subsequent attempts are rejected with HTTP 429 (`Too Many Requests`).

### Session Management
- Sessions use signed HMAC-SHA256 tokens stored in HTTP-only, secure cookies (`pod_auth_session`).
- Tokens include user ID, workspace ID, role, and an expiration timestamp.
- Server validates session expiration on every request.

---

## 4. Database Security & Row Level Security (RLS)

### Supabase PostgreSQL Policies
All tables in `supabase_schema.sql` have Row Level Security enabled:

```sql
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
```

### Server-Side Service Role Key Usage
- The application backend uses the `SUPABASE_SERVICE_ROLE_KEY` exclusively inside server-side route handlers (`src/server/db/supabase-client.ts`).
- Server queries enforce workspace filtering (`eq('workspace_id', user.workspaceId)`), preventing cross-tenant data access (IDOR).

---

## 5. Protected Cron Execution

The `/api/cron/execute` endpoint is safeguarded against unauthorized external execution:
1. Verifies the `Authorization: Bearer <CRON_SECRET>` header.
2. In Vercel deployments, validates the internal `x-vercel-cron: 1` header.
3. Unauthenticated requests are rejected immediately with HTTP 401.

---

## 6. Input Validation & Defense in Depth

1. **Timezone Validation**: User-provided timezones are checked against `Intl.supportedValuesOf('timeZone')`. Invalid timezones default safely to `Asia/Kolkata`.
2. **Time Format Sanitization**: Schedule times are normalized to strict `HH:mm` format.
3. **No Unsafe SQL**: All database operations use parameterized Supabase client calls, preventing SQL injection.
4. **XSS Protection**: React automatically escapes rendered strings in the UI.
