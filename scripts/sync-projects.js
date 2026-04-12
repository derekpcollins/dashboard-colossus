#!/usr/bin/env node

/**
 * sync-projects.js
 * Syncs active projects from Obsidian vault
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const vaultPath = path.join(process.env.HOME, 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Derek\'s Vault/Projects');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function parseProjectFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.md');

    // Parse frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const fm = {};
    if (fmMatch) {
      fmMatch[1].split('\n').forEach(line => {
        const [key, ...val] = line.split(':');
        if (key && val.length) {
          fm[key.trim()] = val.join(':').trim().replace(/^["']|["']$/g, '');
        }
      });
    }

    return {
      name: fileName,
      status: fm.status || 'unknown',
      priority: fm.priority || 'medium',
      category: fm.category || 'general'
    };
  } catch (err) {
    return null;
  }
}

function main() {
  const projects = [];

  if (fs.existsSync(vaultPath)) {
    const files = fs.readdirSync(vaultPath)
      .filter(f => f.endsWith('.md') && !f.startsWith('_'));

    files.forEach(file => {
      const project = parseProjectFile(path.join(vaultPath, file));
      if (project && project.status === 'active') {
        projects.push(project);
      }
    });
  }

  const projectsFile = path.join(dataDir, 'projects.json');
  fs.writeFileSync(projectsFile, JSON.stringify({ projects, synced: new Date().toISOString() }, null, 2), 'utf8');
  console.log(`✅ Projects synced: ${projects.length} active`);
}

main();
