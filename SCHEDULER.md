# Server-Side Scheduling Engine — POD Automation

## 1. Core Principle: Zero Browser Dependency

In traditional web applications, developers mistakenly implement scheduling using client-side primitives:
- ❌ `setInterval()` / `setTimeout()` in React components
- ❌ `useEffect()` listeners triggering API requests
- ❌ `localStorage` / `sessionStorage` event loops
- ❌ Cron jobs that only fire when a user visits or keeps a dashboard tab open

**In POD Automation, the scheduler is 100% server-side.**
- Closing the browser tab does **not** stop the schedule.
- Shutting down laptops does **not** stop the schedule.
- Logging out does **not** stop the schedule.
- The schedule will execute automatically at 09:00 AM or 06:00 PM every scheduled day via server cron.

---

## 2. Scheduling Architecture

```
Every Minute (* * * * *)
       │
       ▼
[Cron Trigger: Vercel / External / Daemon]
       │
       ▼ (Bearer CRON_SECRET)
[POST /api/cron/execute]
       │
       ▼
[Scheduler Engine: executePendingAutomations()]
       │
       ├─► 1. Fetch active schedules from PostgreSQL
       │
       ├─► 2. For each schedule, evaluate in target timezone:
       │      - Day of week (0-6)
       │      - Time comparison against current time in timezone
       │      - Missed-job tolerance window check (diff <= 10 min)
       │
       ├─► 3. Generate Idempotency Key:
       │      "exec_{scheduleId}_{date}_{actionType}"
       │
       ├─► 4. Atomic Lock Check:
       │      Does key already exist in execution_logs?
       │      - YES: SKIP (Already executed)
       │      - NO:  Acquire lock -> INSERT 'RUNNING' status
       │
       ├─► 5. Synthesize POD content (deterministic tasks)
       │
       ├─► 6. Dispatch to Slack Webhook / Bot Token API
       │
       └─► 7. Record Delivery Log & update status:
              - Success: 'SUCCESS' (with durationMs)
              - Failure: 'FAILED' (with error message & retry count)
```

---

## 3. Timezone & Daylight Saving Time (DST) Handling

The system **never assumes the server's local timezone**.
- All schedules store an explicit IANA timezone string (e.g., `Asia/Kolkata`, `America/New_York`, `Europe/London`).
- Calculations utilize the native `Intl.DateTimeFormat` engine:

```ts
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: schedule.timezone,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
});
```

This guarantees accurate local time evaluation regardless of whether the hosting server is in UTC, US East, or EU Central.

---

## 4. Idempotency Key & Execution Locks

To prevent duplicate Slack messages (e.g. if multiple cron jobs fire simultaneously or a job takes several seconds), every execution generates an atomic key:

$$\text{Key} = \text{"exec\_"} + \text{scheduleId} + \text{"\_"} + \text{dateString} + \text{"\_"} + \text{actionType}$$

Example:
`exec_a48f93e1-512a-431a-966a-12e08cf778ad_2026-10-08_opening`

### Race Condition Prevention:
Before any Slack dispatch occurs, the scheduler checks if `execution_logs` has a record matching `execution_key`.
If found with status `SUCCESS` or `RUNNING`, the engine immediately skips processing.

---

## 5. Missed-Job Recovery Window

Network latencies or serverless cold starts may delay cron trigger invocation by 1–3 minutes.
The scheduler uses a configurable tolerance window:

```ts
const toleranceMinutes = parseInt(process.env.CRON_TOLERANCE_MINUTES || '10', 10);
const diffMinutes = currentMinutesInTz - scheduledMinutesInTz;

const isDue = diffMinutes >= 0 && diffMinutes <= toleranceMinutes;
```

- If cron fires at **09:02 AM** for a **09:00 AM** job: The job is safely detected as due and dispatches.
- If cron fires at **10:15 AM** (over 10 minutes late): The job is skipped to prevent sending stale morning greetings mid-day.

---

## 6. How to Trigger Cron in Production

### Method 1: Vercel Cron (Recommended for Vercel Deployments)
`vercel.json` defines a minute-by-minute cron job:
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

### Method 2: External HTTP Cron (AWS EventBridge, Cloudflare Workers, cron-job.org)
Make an HTTP request every minute:
```http
POST https://your-production-app.vercel.app/api/cron/execute HTTP/1.1
Authorization: Bearer <CRON_SECRET>
```

### Method 3: Dedicated Node.js Background Worker (`automation.js`)
If hosting on a Linux VM (EC2, DigitalOcean, Railway, Render):
```bash
npm run automate
```
`automation.js` runs a node-cron loop every minute calling `/api/cron/execute` with the local `CRON_SECRET`.
