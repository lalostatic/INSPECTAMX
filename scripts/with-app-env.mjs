#!/usr/bin/env node
/**
 * Load environment variables from .env and execute a command
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENV_FILE = join(ROOT, '.env');

const env = { ...process.env };

if (existsSync(ENV_FILE)) {
  const contents = readFileSync(ENV_FILE, 'utf-8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    env[key] = val.replace(/^["']|["']$/g, '');
  }
  console.log('✅ Loaded environment from .env');
}

const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('Usage: node scripts/with-app-env.mjs <command>');
  process.exit(1);
}

try {
  execSync(command, { env, stdio: 'inherit', cwd: ROOT });
} catch (err) {
  process.exit(err.status || 1);
}
