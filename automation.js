require('dotenv').config({ path: '.env.local' });
const http = require('http');
const https = require('https');

// Configuration
const NEXTJS_API_URL = process.env.NEXTJS_API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

console.log('====================================================');
console.log('🏛️  POD Automation - Production Scheduler Daemon');
console.log(`📅 Target Server: ${NEXTJS_API_URL}`);
console.log(`🔒 Cron Secret Protected: ${CRON_SECRET ? 'YES' : 'NO (Development Mode)'}`);
console.log(`⏱️ Frequency: Every 30 seconds`);
console.log('====================================================\n');

function triggerCronCheck() {
  const currentLocalTime = new Date().toLocaleTimeString();
  const urlObj = new URL(`${NEXTJS_API_URL}/api/cron/execute`);
  const client = urlObj.protocol === 'https:' ? https : http;

  const headers = {};
  if (CRON_SECRET) {
    headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    headers['x-cron-secret'] = CRON_SECRET;
  }

  const req = client.get(
    urlObj.toString(),
    { headers },
    (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.report) {
            const { jobsTriggered, jobsSucceeded, jobsFailed, jobsSkipped, details } = result.report;
            if (jobsTriggered > 0) {
              console.log(`\n[${currentLocalTime}] 🚀 Triggered ${jobsTriggered} scheduled job(s) (${jobsSucceeded} succeeded, ${jobsFailed} failed):`);
              details.forEach((d) => {
                console.log(`  - [${d.status}] ${d.scheduleName} | Action: ${d.actionType} | Channel: ${d.channel} | Key: ${d.executionKey}`);
                if (d.error) console.log(`    ↳ Error: ${d.error}`);
              });
            } else if (jobsSkipped > 0) {
              // already executed today
            }
          }
        } catch {
          // silent on empty
        }
      });
    }
  );

  req.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.warn(`[${currentLocalTime}] ⚠️ Could not reach server at ${NEXTJS_API_URL}. Ensure Next.js is running.`);
    } else {
      console.error(`[${currentLocalTime}] ❌ Scheduler error:`, err.message);
    }
  });
}

// Initial check on launch
triggerCronCheck();

// Check every 30 seconds
setInterval(triggerCronCheck, 30000);

console.log('✅ Background scheduler daemon is active. Press Ctrl+C to stop.\n');
