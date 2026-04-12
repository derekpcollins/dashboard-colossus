#!/usr/bin/env node

/**
 * log-tokens.js
 * Logs token usage per model to tokens.json
 * 
 * Usage: node scripts/log-tokens.js --model anthropic/claude-sonnet-4-6 --input 5000 --output 1200
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dataDir = path.join(__dirname, '..', 'data');
const tokensFile = path.join(dataDir, 'tokens.json');

// Parse arguments
const opts = {};
for (let i = 0; i < args.length; i += 2) {
  opts[args[i].replace('--', '')] = args[i + 1];
}

if (!opts.model || !opts.input || !opts.output) {
  console.error('Usage: node scripts/log-tokens.js --model <model> --input <input> --output <output>');
  process.exit(1);
}

// Create data directory if needed
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing data or create new
let data = { sessions: [] };
if (fs.existsSync(tokensFile)) {
  data = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
}

// Add new entry
const inputTokens = parseInt(opts.input);
const outputTokens = parseInt(opts.output);
const totalTokens = inputTokens + outputTokens;

const entry = {
  timestamp: new Date().toISOString(),
  model: opts.model,
  inputTokens,
  outputTokens,
  totalTokens
};

data.sessions.push(entry);

// Calculate summary stats
const byModel = {};
data.sessions.forEach(session => {
  if (!byModel[session.model]) {
    byModel[session.model] = { total: 0, sessions: 0 };
  }
  byModel[session.model].total += session.totalTokens;
  byModel[session.model].sessions += 1;
});

data.summary = byModel;

// Write back
fs.writeFileSync(tokensFile, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Logged: ${opts.model} — ${totalTokens} tokens (${inputTokens} in, ${outputTokens} out)`);
