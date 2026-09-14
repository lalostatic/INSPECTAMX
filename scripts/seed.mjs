#!/usr/bin/env node
/**
 * INSPECTAMX - Seed Script
 * Seeds initial data for development
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

console.log('\n🌱 Seeding INSPECTAMX database...\n');

const seedSQL = `
-- Seed data is included in the migration file 0001_init.sql
-- This script can be used to add additional seed data

SELECT 'Checking seed data...' as status;
SELECT COUNT(*) as tenants FROM tenants;
SELECT COUNT(*) as users FROM users;
SELECT COUNT(*) as containers FROM containers;
SELECT COUNT(*) as supplies FROM supplies;
`;

try {
  // Write temp seed file
  const tmpFile = join(ROOT, 'cloudflare', 'migrations', '_seed_check.sql');
  const { writeFileSync, unlinkSync } = await import('fs');
  writeFileSync(tmpFile, seedSQL);

  execSync(
    `wrangler d1 execute inspectamx --file="${tmpFile}" --local`,
    { cwd: join(ROOT, 'cloudflare'), stdio: 'inherit' }
  );

  unlinkSync(tmpFile);
  console.log('\n✅ Seed check completed!\n');
  console.log('Default credentials:');
  console.log('  Developer: dev@inspecta.mx / DevPass2026!');
  console.log('  Admin:     Admin@myrmex.com / AdminPass2026!');
  console.log('  Tenant:    MYRMEX (myrmex)\n');
} catch (err) {
  console.error('Seed error:', err.message);
  process.exit(1);
}
