#!/usr/bin/env node

/**
 * sync-data.js
 * Syncs cron jobs and token usage to dashboard data files
 * Run via cron: 0 * * * * node ~/Developer/dashboard/scripts/sync-data.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ─── Sync Cron Jobs ───────────────────────────────────────────────────────

function syncCronJobs() {
  try {
    const crontab = execSync('crontab -l 2>/dev/null || echo ""', { encoding: 'utf8' });
    const cronFile = path.join(dataDir, 'crons.json');
    
    // Load existing data to preserve last run times
    let existing = { crons: [] };
    if (fs.existsSync(cronFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
      } catch {}
    }

    const crons = [];
    crontab.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      // Parse cron format: minute hour day month dow command
      const parts = line.split(/\s+/);
      if (parts.length < 6) return;

      const [minute, hour, day, month, dow, ...cmd] = parts;
      const command = cmd.join(' ');

      // Extract readable name from command
      let name = command;
      if (command.includes('morning-brief')) name = 'Morning Brief';
      else if (command.includes('evening-brief')) name = 'Evening Brief';
      else if (command.includes('sync-data')) name = 'Dashboard Sync';

      // Find last run time from existing data
      const existing_cron = existing.crons.find(c => c.task === name);
      const lastRun = existing_cron ? existing_cron.lastRun : null;

      crons.push({
        time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
        schedule: 'Daily',
        task: name,
        status: 'Active',
        lastRun: lastRun,
        raw: line
      });
    });

    fs.writeFileSync(cronFile, JSON.stringify({ crons }, null, 2), 'utf8');
    console.log(`✅ Synced ${crons.length} cron jobs`);
  } catch (err) {
    console.error('❌ Failed to sync cron jobs:', err.message);
  }
}

// ─── Sync Token Usage ──────────────────────────────────────────────────────

function syncTokenUsage() {
  const tokenFile = path.join(dataDir, 'tokens.json');
  
  if (!fs.existsSync(tokenFile)) {
    // Create empty structure
    fs.writeFileSync(tokenFile, JSON.stringify({ sessions: [], summary: {} }, null, 2), 'utf8');
    console.log('✅ Token usage file initialized');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    
    // Recalculate summary
    const summary = {};
    (data.sessions || []).forEach(session => {
      if (!summary[session.model]) {
        summary[session.model] = { total: 0, sessions: 0 };
      }
      summary[session.model].total += session.totalTokens;
      summary[session.model].sessions += 1;
    });

    data.summary = summary;
    fs.writeFileSync(tokenFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Synced token usage (${(data.sessions || []).length} sessions)`);
  } catch (err) {
    console.error('❌ Failed to sync token usage:', err.message);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

syncCronJobs();
syncTokenUsage();

// Parse PROJECTS.md first to generate the master JSON from markdown
try {
  console.log('Generating projects-master.json from PROJECTS.md...');
  execSync(`node ${path.join(__dirname, 'parse-projects.js')}`, { stdio: 'inherit' });
} catch (err) {
  console.error('⚠️ Projects markdown parsing failed:', err.message);
}

// Run child sync scripts
try {
  console.log('Running system health sync...');
  execSync(`node ${path.join(__dirname, 'sync-system-health.js')}`, { stdio: 'inherit' });
} catch (err) {
  console.error('⚠️ System health sync failed:', err.message);
}

try {
  console.log('Running projects sync...');
  execSync(`node ${path.join(__dirname, 'sync-projects.js')}`, { stdio: 'inherit' });
} catch (err) {
  console.error('⚠️ Projects sync failed:', err.message);
}

console.log(`✅ Dashboard data synced at ${new Date().toISOString()}`);
