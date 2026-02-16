#!/usr/bin/env node

/**
 * Release Notes Generator
 *
 * Generates RELEASE_NOTES.md from the root package version, git history, and a template.
 * Run with: node scripts/generate-release-notes.mjs [--env <environment>]
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const environment = envIndex !== -1 ? args[envIndex + 1] : 'Preview';

/**
 * Read package.json and return parsed content
 */
function readPackageJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Get commits since last tag
 */
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync("git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo ''", {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    }).trim();

    if (!lastTag) {
      return execSync('git log -20 --pretty=format:"%s"', {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
      })
        .split('\n')
        .filter(Boolean);
    }

    return execSync(`git log ${lastTag}..HEAD --pretty=format:"%s"`, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Categorize commits into sections
 */
function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    other: [],
  };

  for (const commit of commits) {
    const lower = commit.toLowerCase();
    if (lower.startsWith('feat') || lower.includes('add ') || lower.includes('new ')) {
      categories.features.push(commit);
    } else if (lower.startsWith('fix') || lower.includes('fix ')) {
      categories.fixes.push(commit);
    } else if (
      lower.startsWith('chore') ||
      lower.startsWith('refactor') ||
      lower.includes('update') ||
      lower.includes('improve')
    ) {
      categories.improvements.push(commit);
    } else {
      categories.other.push(commit);
    }
  }

  return categories;
}

/**
 * Format date as "YYYY-MM-DD"
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Generate the release notes markdown
 */
function generateReleaseNotes() {
  const rootPkg = readPackageJson(join(ROOT_DIR, 'package.json'));
  const version = rootPkg?.version || '0.0.0';
  const date = formatDate(new Date());
  const commits = getCommitsSinceLastTag();
  const categorized = categorizeCommits(commits);

  const improvementsList =
    categorized.improvements.length > 0
      ? categorized.improvements.map((c) => `- ${c}`).join('\n')
      : 'N/A for this release.';

  const fixesList =
    categorized.fixes.length > 0 ? categorized.fixes.map((c) => `- ${c}`).join('\n') : 'N/A for this release.';

  const featuresList =
    categorized.features.length > 0
      ? categorized.features.map((c) => `- ${c}`).join('\n')
      : 'N/A for this release.';

  const template = `# Midnight cNight to DUST DApp - Release Notes
### Version ${version}
**Version:** ${version} **Date:** ${date} **Environment:** ${environment}
---
### High-level summary
The Midnight cNight to DUST DApp is a web application for converting cNight tokens to DUST on the Midnight Network.
It provides a user-friendly interface for wallet connection, token conversion, and transaction tracking.
---
### Audience
This release is relevant for:
- Users converting cNight tokens to DUST on the Midnight Network
- Developers building and testing on the Midnight Network
- Operators deploying the cNight to DUST DApp infrastructure
---
### What changed (Summary of updates)
${
  commits.length > 0
    ? commits
        .slice(0, 10)
        .map((c) => `- ${c}`)
        .join('\n')
    : '- No changes since last release'
}
---
### Features
${featuresList}
---
### Improvements
${improvementsList}
---
### Fixed defect list
${fixesList}
`;

  return template;
}

// Main execution
const releaseNotes = generateReleaseNotes();
const outputPath = join(ROOT_DIR, 'RELEASE_NOTES.md');
writeFileSync(outputPath, releaseNotes);
console.log(`Release notes generated: ${outputPath}`);
