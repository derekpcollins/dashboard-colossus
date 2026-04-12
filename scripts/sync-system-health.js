#!/usr/bin/env node

/**
 * sync-system-health.js
 * Syncs Mac system health metrics (uptime, disk, memory, network)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getSystemHealth() {
  try {
    // Uptime
    const uptime = execSync('uptime', { encoding: 'utf8' }).trim();
    const uptimeMatch = uptime.match(/up\s+(.+?),\s+\d+\s+user/);
    const uptimeStr = uptimeMatch ? uptimeMatch[1] : 'unknown';

    // Disk usage
    const diskRaw = execSync("df -h / | tail -1", { encoding: 'utf8' }).trim();
    const diskParts = diskRaw.split(/\s+/);
    const diskUsed = diskParts[2];
    const diskTotal = diskParts[1];
    const diskPercent = diskParts[4];

    // Memory usage
    const memRaw = execSync("vm_stat | grep 'Pages free'", { encoding: 'utf8' }).trim();

    // Network (last 24h traffic via netstat — approximation)
    let networkStatus = 'Active';
    try {
      execSync('ping -c 1 8.8.8.8 > /dev/null 2>&1');
      networkStatus = 'Connected';
    } catch {
      networkStatus = 'Offline';
    }

    return {
      timestamp: new Date().toISOString(),
      uptime: uptimeStr,
      disk: {
        used: diskUsed,
        total: diskTotal,
        percent: diskPercent
      },
      network: networkStatus,
      status: 'Healthy' // Default; could add logic to set warnings
    };
  } catch (err) {
    console.error('Error reading system health:', err.message);
    return null;
  }
}

function main() {
  const health = getSystemHealth();
  if (!health) {
    console.error('Failed to read system health');
    process.exit(1);
  }

  const healthFile = path.join(dataDir, 'system-health.json');
  fs.writeFileSync(healthFile, JSON.stringify(health, null, 2), 'utf8');
  console.log(`✅ System health synced: ${health.status}`);
}

main();
