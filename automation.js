require('dotenv').config({ path: '.env.local' });
const cron = require('node-cron');
const http = require('http');

// Configuration
// Schedule: Every 30 seconds to ensure no minute boundary is missed
const NEXTJS_API_URL = process.env.NEXTJS_API_URL || 'http://localhost:3000';

console.log('====================================================');
console.log('🕒 POD Automation Background Scheduler Daemon Started');
console.log(`📅 Target Next.js server: ${NEXTJS_API_URL}`);
console.log(`⏱️ Schedule poll: Running every 30 seconds`);
console.log('====================================================\n');

function triggerCronCheck() {
  const currentLocalTime = new Date().toLocaleTimeString();

  const req = http.get(`${NEXTJS_API_URL}/api/cron/trigger`, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.triggered && result.triggered.length > 0) {
          console.log(`\n[${currentLocalTime}] 🚀 Dispatched ${result.triggered.length} Scheduled POD(s):`);
          result.triggered.forEach((t) => {
            console.log(`  - User: ${t.user} | Type: ${t.type} | Time: ${t.time}`);
          });
        }
      } catch (e) {
        // Silent JSON parse errors on empty responses
      }
    });
  });

  req.on('error', (err) => {
    // Only warn if connection refused
    if (err.code === 'ECONNREFUSED') {
      console.warn(`[${currentLocalTime}] ⚠️ Could not reach Next.js server on ${NEXTJS_API_URL}. Ensure Next.js app is running.`);
    } else {
      console.error(`[${currentLocalTime}] ❌ Scheduler error:`, err.message);
    }
  });
}

// Run immediately on start
triggerCronCheck();

// Check every 30 seconds
setInterval(triggerCronCheck, 30000);

console.log('✅ Scheduler daemon active in background. Press Ctrl+C to stop.\n');
