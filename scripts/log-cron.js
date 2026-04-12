#!/usr/bin/env node

/**
 * log-cron.js
 * Records when a cron job executed
 * Usage: node scripts/log-cron.js --name "Morning Brief"
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const name = args[args.indexOf('--name') + 1];

if (!name) {
  console.error('Usage: node scripts/log-cron.js --name "Job Name"');
  process.exit(1);
}

const dataDir = path.join(__dirname, '..', 'data');
const cronFile = path.join(dataDir, 'crons.json');

if (!fs.existsSync(cronFile)) {
  console.error('Cron data file not found. Run sync-data.js first.');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
  const cron = data.crons.find(c => c.task === name);
  
  if (cron) {
    cron.lastRun = new Date().toISOString();
    fs.writeFileSync(cronFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Logged: ${name} at ${cron.lastRun}`);
  } else {
    console.error(`Cron job not found: ${name}`);
    process.exit(1);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
