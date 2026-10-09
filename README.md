# POD Automation — Intelligent Opening & Closing Automation Platform

> **Enterprise Royal SaaS** daily engineering Opening (AM) & Closing (PM / EOD) task generator with autonomous server-side dispatch to Slack. Built for high reliability, multi-timezone operations, and zero browser dependency.

---

## 🌟 Overview & Key Capabilities

POD Automation automates the generation and transmission of daily team task summaries into Slack:
- **Autonomous Server-Side Scheduling**: Executes on the server regardless of whether a browser or dashboard is open, whether user is logged in, or whether laptops are turned off.
- **Relational PostgreSQL Schema (Supabase)**: Multi-tenant, UUID-keyed architecture with strict Row Level Security (RLS) policies.
- **Strict Idempotency Locking**: Guarantees zero duplicate Slack messages even if cron workers fire multiple times or overlap.
- **Timezone-Aware Calculations**: Supports `Asia/Kolkata`, `America/New_York`, `Europe/London`, etc., taking daylight saving time (DST) into account.
- **Missed-Job Recovery Policy**: Tolerant catch-up execution window (`CRON_TOLERANCE_MINUTES=10`) protects against infrastructure delays.
- **Executive Royal SaaS Interface**: Tailored deep navy (`#060913`) aesthetics, midnight glass surfaces, refined gold/indigo highlights, and live execution auditing.

---

## 🏗️ Architecture Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, Vanilla CSS Design System (`royal-*` tokens)
- **Backend / API**: Next.js Server Endpoints & Route Handlers (`src/app/api/`)
- **Database**: PostgreSQL (Supabase) via `@supabase/supabase-js`, with resilient zero-downtime local JSON fallback for disconnected local testing
- **Authentication**: Cryptographic PBKDF2 (100,000 iterations, SHA-512) password hashing, HMAC-SHA256 session tokens, and IP-level brute force rate limiting
- **Scheduling**: Server-side cron endpoints (`/api/cron/execute`) triggered by Vercel Cron, external HTTP cron, or background Node workers

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher

### 2. Installation
```bash
git clone https://github.com/your-org/pod-automation.git
cd pod-automation
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your environment variables:
```ini
# Supabase PostgreSQL Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Cron Secret for Autonomous Trigger
CRON_SECRET=pod_production_cron_secret_key_change_me_in_prod

# Authentication Secret
AUTH_SECRET=pod_jwt_session_secret_change_me_in_prod

# Slack Integration (Optional default fallback)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_BOT_TOKEN=xoxb-...
```

### 4. Database Setup
Execute `supabase_schema.sql` in your Supabase SQL Editor to provision all 11 tables, indexes, and RLS policies:
```bash
# Optional automated migration script
npm run migrate:supabase
```

### 5. Running the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Royal SaaS portal.

---

## 🧪 Testing & Validation

Run the verification test suite covering timezone normalization, idempotency locks, password security, and scheduling logic:
```bash
npm test
```

Run TypeScript compilation check:
```bash
npx tsc --noEmit
```

Run code formatting and ESLint:
```bash
npm run lint
```

Build the production bundle:
```bash
npm run build
```

---

## ⏰ Autonomous Server-Side Scheduler

The scheduling engine **does NOT depend on an open browser tab**. Execution runs purely server-side via `/api/cron/execute`.

### Setting up Cron Invocation

#### Option A: Vercel Cron (Configured in `vercel.json`)
The included `vercel.json` automatically schedules `/api/cron/execute` to run every minute on Vercel:
```json
{
  "crons": [
    {
      "path": "/api/cron/execute",
      "schedule": "* * * * *"
    }
  ]
}
```
Vercel automatically sets the `x-vercel-cron: 1` header, authenticating the request.

#### Option B: External Cron (cron-job.org, Cloudflare Workers, AWS EventBridge)
Configure a recurring HTTP `POST` or `GET` request to:
```
POST https://your-domain.com/api/cron/execute
Headers:
  Authorization: Bearer <CRON_SECRET>
```

#### Option C: Self-Hosted Background Node Worker
For on-premise or VM deployments:
```bash
npm run automate
```
This runs `automation.js`, which fires the server endpoint every minute with `CRON_SECRET`.

---

## 🔐 Security Model

1. **Client-Side Secret Isolation**: Bot tokens, webhook URLs, and `SUPABASE_SERVICE_ROLE_KEY` are strictly server-side and never exposed to the browser.
2. **PBKDF2 Password Hashing**: Passwords are saved with 100,000 rounds of SHA-512 and cryptographic random salts.
3. **Session Authentication**: Signed HTTP-only session cookies with expiration checks and brute force rate limiting (maximum 5 attempts per 15 minutes).
4. **Idempotency Locks**: Execution keys (`exec_<scheduleId>_<date>_<actionType>`) prevent race conditions and duplicate Slack dispatches.

---

## 📁 Repository Structure

```
├── .env.example                # Sample environment variables
├── vercel.json                 # Vercel Cron job configuration
├── supabase_schema.sql         # Production PostgreSQL schema (11 tables)
├── automation.js               # Background Node.js scheduler daemon
├── scripts/
│   ├── run-tests.js            # Automated verification test suite
│   └── migrate-to-supabase.js  # Database migration runner
├── src/
│   ├── app/                    # Next.js App Router (pages & API routes)
│   │   ├── api/cron/execute/   # Protected server-side cron trigger
│   │   ├── api/automations/    # Schedules CRUD
│   │   ├── api/slack/          # Slack configuration & test dispatch
│   │   ├── api/auth/           # Production login, registration, sessions
│   │   └── page.tsx            # Royal SaaS Executive Dashboard
│   ├── components/             # Royal SaaS UI components
│   │   ├── activity/           # Real-time execution audit logs
│   │   ├── automations/        # Schedule wizard, preview, and listing
│   │   ├── dashboard/          # Metrics and live action monitors
│   │   ├── slack/              # Slack workspace configuration card
│   │   └── pastdata/           # Sprint task bank & pattern generator
│   ├── lib/
│   │   ├── timezone.ts         # Timezone & next run calculation engine
│   │   └── analyzer.ts         # Authentic NPCI/PSO task generator logic
│   ├── server/
│   │   ├── auth/               # Password hashing & JWT validation
│   │   ├── db/                 # Supabase & Fallback database adapters
│   │   ├── scheduler/          # Autonomous scheduling engine
│   │   └── slack/              # Secure Slack API client
│   └── types/                  # Unified domain TypeScript interfaces
```

---

## 📜 Documentation Index

- [ARCHITECTURE.md](file:///d:/POD_automation/pod-automation/ARCHITECTURE.md) — Detailed system design, data flow, and components.
- [SCHEDULER.md](file:///d:/POD_automation/pod-automation/SCHEDULER.md) — Timezones, idempotency keys, tolerance windows, and missed-job recovery.
- [SECURITY.md](file:///d:/POD_automation/pod-automation/SECURITY.md) — Authentication, credential encryption, rate limiting, and RLS policies.
