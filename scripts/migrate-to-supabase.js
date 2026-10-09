/**
 * One-Click Migration Script: Local JSON Storage -> Supabase PostgreSQL
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

console.log('====================================================');
console.log('🚀 Supabase Migration Tool');
console.log('====================================================\n');

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon-key')) {
  console.error('❌ Error: Supabase credentials are missing or placeholders in .env.local!');
  console.error('Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running this script.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log(`📡 Connecting to Supabase at: ${supabaseUrl}`);

  const dataDir = path.join(__dirname, '..', 'data');

  // 1. Migrate Users & Past Data
  const usersPath = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      console.log(`\n👤 Found ${usersData.length} user(s) to migrate...`);

      for (const user of usersData) {
        const userRow = {
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          email: user.email,
          password_hash: user.passwordHash,
          salt: user.salt,
          channels: user.channels || {},
          schedule: user.schedule || {},
          created_at: user.createdAt || new Date().toISOString(),
          updated_at: user.updatedAt || new Date().toISOString(),
        };

        const { error: userError } = await supabase.from('users').upsert(userRow);
        if (userError) {
          console.error(`  ❌ Failed to migrate user ${user.username}:`, userError.message);
        } else {
          console.log(`  ✅ User migrated: ${user.username} (${user.id})`);
        }

        // Migrate past data for this user
        if (user.pastData && Array.isArray(user.pastData) && user.pastData.length > 0) {
          console.log(`    ↳ Migrating ${user.pastData.length} past data log(s)...`);
          const pastRows = user.pastData.map((pd) => ({
            id: pd.id,
            user_id: user.id,
            date: pd.date,
            type: pd.type || 'GENERAL',
            category: pd.category || 'Sprint Tasks',
            tasks: pd.tasks || [],
            notes: pd.notes || '',
            created_at: pd.createdAt || new Date().toISOString(),
          }));

          const { error: pdError } = await supabase.from('past_data').upsert(pastRows);
          if (pdError) {
            console.error(`    ❌ Error inserting past data:`, pdError.message);
          } else {
            console.log(`    ✅ Successfully inserted ${pastRows.length} past data log(s).`);
          }
        }
      }
    } catch (e) {
      console.error('Error reading users.json:', e.message);
    }
  }

  // 2. Migrate POD History
  const historyPath = path.join(dataDir, 'pod_history.json');
  if (fs.existsSync(historyPath)) {
    try {
      const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      console.log(`\n📜 Found ${historyData.length} history item(s) to migrate...`);

      if (historyData.length > 0) {
        const histRows = historyData.map((h) => ({
          id: h.id,
          user_id: h.userId,
          username: h.username,
          type: h.type,
          channel: h.channel || 'slack',
          content: h.content,
          status: h.status || 'SUCCESS',
          error: h.error || null,
          timestamp: h.timestamp || new Date().toISOString(),
        }));

        const { error: histError } = await supabase.from('pod_history').upsert(histRows);
        if (histError) {
          console.error('  ❌ Error inserting history rows:', histError.message);
        } else {
          console.log(`  ✅ Successfully migrated ${histRows.length} history log(s).`);
        }
      }
    } catch (e) {
      console.error('Error reading pod_history.json:', e.message);
    }
  }

  // 3. Migrate Sessions
  const sessionsPath = path.join(dataDir, 'sessions.json');
  if (fs.existsSync(sessionsPath)) {
    try {
      const sessionsData = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
      console.log(`\n🔑 Found ${sessionsData.length} session(s) to migrate...`);

      if (sessionsData.length > 0) {
        const sessRows = sessionsData.map((s) => ({
          token: s.token,
          user_id: s.userId,
          created_at: s.createdAt || new Date().toISOString(),
          expires_at: s.expiresAt,
        }));

        const { error: sessError } = await supabase.from('sessions').upsert(sessRows);
        if (sessError) {
          console.error('  ❌ Error inserting sessions:', sessError.message);
        } else {
          console.log(`  ✅ Successfully migrated ${sessRows.length} session(s).`);
        }
      }
    } catch (e) {
      console.error('Error reading sessions.json:', e.message);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 Migration completed successfully!');
  console.log('====================================================\n');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
