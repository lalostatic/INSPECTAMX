#!/usr/bin/env node
/**
 * INSPECTAMX - Database Migration Script
 * Runs D1 migrations using wrangler
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'cloudflare', 'migrations');

const args = process.argv.slice(2);
const env = args.includes('--dev') ? 'development' : 'production';
const envFlag = env === 'development' ? '--local' : '';

console.log(`\n🔄 Running INSPECTAMX migrations (${env})...\n`);

try {
  // Get migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  for (const file of files) {
    const filePath = join(MIGRATIONS_DIR, file);
    console.log(`Running migration: ${file}`);

    try {
      execSync(
        `wrangler d1 execute inspectamx --file="${filePath}" ${envFlag}`,
        { cwd: join(ROOT, 'cloudflare'), stdio: 'inherit' }
      );
      console.log(`✅ ${file} completed\n`);
    } catch (err) {
      console.error(`❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('✅ All migrations completed successfully!\n');
} catch (err) {
  console.error('Migration error:', err);
  process.exit(1);
}
