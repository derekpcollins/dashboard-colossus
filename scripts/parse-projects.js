#!/usr/bin/env node

/**
 * parse-projects.js
 * Parses PROJECTS.md (markdown source of truth) and generates projects-master.json
 * Run via: node ~/Developer/dashboard/scripts/parse-projects.js
 */

const fs = require('fs');
const path = require('path');

const projectsMarkdown = path.join(__dirname, '..', 'PROJECTS.md');
const dataDir = path.join(__dirname, '..', 'data');
const outputFile = path.join(dataDir, 'projects-master.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Generate a slug ID from a project name
 * @param {string} name
 * @returns {string}
 */
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Parse PROJECTS.md and extract projects
 * Structure:
 * ### Category
 * #### Active/Complete
 * - **Project Name**
 *   __Description here...__
 *   📍 `Projects/Filename.md` | 📅 2026-03-27
 */
function parseProjects() {
  try {
    const content = fs.readFileSync(projectsMarkdown, 'utf8');
    const projects = [];
    let currentCategory = null;
    let currentStatus = null;

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect category header (### Category (N))
      if (line.startsWith('### ')) {
        currentCategory = line
          .replace(/^### /, '')
          .replace(/\s*\(\d+\)\s*$/, '')
          .trim();
      }

      // Detect status header (#### Active (N) or #### Complete (N))
      if (line.startsWith('#### ')) {
        const statusText = line.replace(/^#### /, '').trim().toLowerCase();
        if (statusText.startsWith('active')) {
          currentStatus = 'active';
        } else if (statusText.startsWith('complete')) {
          currentStatus = 'complete';
        }
      }

      // Detect project entry (- **Project Name**)
      if (line.startsWith('- **') && currentCategory && currentStatus) {
        let projectName = line
          .replace(/^- \*\*/, '')
          .replace(/\*\*\s*$/, '')
          .trim();
        // Clean up any trailing asterisks
        projectName = projectName.replace(/\*+\s*$/, '').trim();

        // Extract description from next line(s) starting with __
        let description = '';
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('__')) {
          description = lines[i + 1]
            .trim()
            .replace(/^__/, '')
            .replace(/__\s*$/, '')
            .trim();
        }

        // Extract location and lastUpdate from lines with 📍 and 📅
        let location = '';
        let lastUpdate = '';

        // Look ahead for metadata line(s)
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const metaLine = lines[j];

          // Parse location: 📍 `Projects/Filename.md`
          if (metaLine.includes('📍')) {
            const locMatch = metaLine.match(/📍\s*`([^`]+)`/);
            if (locMatch) {
              location = locMatch[1];
            }
          }

          // Parse last update: 📅 2026-03-27
          if (metaLine.includes('📅')) {
            const dateMatch = metaLine.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              lastUpdate = dateMatch[1];
            }
          }

          // Stop if we hit the next project or header
          if (metaLine.trim() === '' || metaLine.startsWith('-') || metaLine.startsWith('#')) {
            break;
          }
        }

        const project = {
          id: generateId(projectName),
          name: projectName,
          status: currentStatus,
          category: currentCategory,
          location: location || '',
          description: description || '',
          lastUpdate: lastUpdate || ''
        };

        projects.push(project);
      }
    }

    // Sort by category, then by status (active first), then by name
    projects.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Count statuses
    const statusCounts = {};
    projects.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    // Build output
    const output = {
      generated: new Date().toISOString(),
      totalProjects: projects.length,
      statusCounts,
      projects
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✅ Parsed PROJECTS.md: ${projects.length} projects`);
    console.log(`   Active: ${statusCounts.active || 0}, Complete: ${statusCounts.complete || 0}`);

    return output;
  } catch (err) {
    console.error('❌ Failed to parse PROJECTS.md:', err.message);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  parseProjects();
}

module.exports = { parseProjects };
