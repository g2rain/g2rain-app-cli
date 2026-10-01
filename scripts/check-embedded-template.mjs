#!/usr/bin/env node
/**
 * Lightweight presence check used when full meta v2 snapshots are not yet
 * written (migration). Prefer `npm run verify:template-snapshots`.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appPkg = path.join(root, 'template', 'package.json');
const shellPkg = path.join(root, 'template-shell', 'package.json');
const legacyRegistry = path.join(
  root,
  'template-shell-legacy',
  'src',
  'platform',
  'legacy',
  'registry.ts',
);

let failed = false;

if (!fs.existsSync(appPkg)) {
  console.error('✖ Embedded app template missing: template/package.json');
  failed = true;
} else {
  console.log('✔ Embedded app template present');
}

if (!fs.existsSync(shellPkg)) {
  console.error('✖ Embedded shell template missing: template-shell/package.json');
  failed = true;
} else {
  console.log('✔ Embedded shell template present');
}

if (!fs.existsSync(legacyRegistry)) {
  console.error('✖ Embedded shell legacy overlay missing: template-shell-legacy/...');
  failed = true;
} else if (fs.existsSync(path.join(root, 'template-shell', 'legacy-overlay'))) {
  console.error('✖ template-shell must not contain legacy-overlay/');
  failed = true;
} else {
  console.log('✔ Embedded shell legacy overlay present');
}

if (failed) process.exit(1);

const metaPath = path.join(root, 'template', '.g2rain-template-meta.json');
if (fs.existsSync(metaPath)) {
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (meta.schemaVersion === 2) {
      const result = spawnSync(
        process.execPath,
        [path.join(root, 'scripts', 'verify-template-snapshots.mjs')],
        { stdio: 'inherit', cwd: root, env: process.env },
      );
      process.exit(result.status === null ? 1 : result.status);
    }
  } catch {
    // fall through — presence check only
  }
}

console.log('✔ Embedded templates present (meta v2 verify deferred until sync)');
