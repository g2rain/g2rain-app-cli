/**
 * Forwarder so App scripts do not rely on `npm run ... -- --flags`
 * (some npm versions swallow --tables / --no-* as npm config).
 *
 * Usage:
 *   node scripts/run-generate.mjs --tables=member --skip-view --skip-api --skip-mock --skip-route
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'node_modules', 'create-g2rain-app', 'dist', 'index.js');
const forwarded = process.argv.slice(2);
const result = spawnSync(process.execPath, [cli, 'generate', ...forwarded], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
process.exit(result.status ?? 1);
