#!/usr/bin/env node
/**
 * INSPECTAMX - Build Script
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

console.log('\n🔨 Building INSPECTAMX...\n');

try {
  // Type check
  console.log('1/3 Type checking...');
  execSync('npm run typecheck', { cwd: ROOT, stdio: 'inherit' });
  console.log('✅ Type check passed\n');

  // Build frontend
  console.log('2/3 Building frontend...');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  console.log('✅ Frontend built\n');

  // Build worker
  console.log('3/3 Building Cloudflare Worker...');
  execSync('wrangler deploy --dry-run', { cwd: join(ROOT, 'cloudflare'), stdio: 'inherit' });
  console.log('✅ Worker build validated\n');

  console.log('🎉 Build completed successfully!\n');
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
