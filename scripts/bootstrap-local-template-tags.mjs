#!/usr/bin/env node
/**
 * One-shot bootstrap: create local git tags + sync embedded snapshots when
 * upstream template tags are not yet available.
 *
 * Usage (from g2rain-app-cli root):
 *   node scripts/bootstrap-local-template-tags.mjs
 *
 * Creates tag v0.1.0-cli-bootstrap on app-template HEAD (if missing),
 * builds a temporary git checkout of shell-template with the same tag,
 * then runs sync:templates with G2RAIN_ALLOW_LOCAL_SYNC=1.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const TAG = process.env.G2RAIN_BOOTSTRAP_TAG || 'v0.1.0-cli-bootstrap';
const appSource = path.resolve(
  process.env.G2RAIN_TEMPLATE_SOURCE || path.join(root, '..', 'g2rain-app-template'),
);
const shellSource = path.resolve(
  process.env.G2RAIN_SHELL_TEMPLATE_SOURCE ||
    path.join(root, '..', 'g2rain-shell-template'),
);

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function ensureAppTag() {
  if (!fse.existsSync(path.join(appSource, '.git'))) {
    throw new Error(`App template is not a git repo: ${appSource}`);
  }
  const head = run('git', ['rev-parse', 'HEAD'], { cwd: appSource });
  try {
    const existing = run('git', ['rev-parse', `${TAG}^{commit}`], {
      cwd: appSource,
    });
    if (existing.toLowerCase() !== head.toLowerCase()) {
      throw new Error(
        `Tag ${TAG} exists at ${existing} but HEAD is ${head}. Delete or choose another G2RAIN_BOOTSTRAP_TAG.`,
      );
    }
    console.log(`✔ App tag ${TAG} already points at HEAD`);
  } catch (error) {
    if (/exists at/.test(String(error.message))) throw error;
    run('git', ['tag', TAG, head], { cwd: appSource });
    console.log(`✔ Created local app tag ${TAG} → ${head}`);
  }
  // Detach to tag so sync HEAD check passes even if branch moved... HEAD already matches.
  return head;
}

async function materializeShellGitCheckout() {
  if (!fse.existsSync(path.join(shellSource, 'package.json'))) {
    throw new Error(`Shell template missing package.json: ${shellSource}`);
  }
  if (!fse.existsSync(path.join(shellSource, 'legacy-overlay'))) {
    throw new Error(`Shell template missing legacy-overlay/: ${shellSource}`);
  }

  const tmp = await fse.mkdtemp(path.join(os.tmpdir(), 'g2rain-shell-bootstrap-'));
  await fse.copy(shellSource, tmp, {
    filter: (src) => {
      const rel = path.relative(shellSource, src);
      if (!rel || rel === '.') return true;
      const parts = rel.split(path.sep);
      if (parts.includes('node_modules') || parts.includes('.git') || parts.includes('dist')) {
        return false;
      }
      return true;
    },
  });

  run('git', ['init'], { cwd: tmp });
  run('git', ['config', 'user.email', 'bootstrap@g2rain.local'], { cwd: tmp });
  run('git', ['config', 'user.name', 'g2rain-bootstrap'], { cwd: tmp });
  run('git', ['add', '-A'], { cwd: tmp });
  run('git', ['commit', '-m', `bootstrap ${TAG}`], { cwd: tmp });
  const head = run('git', ['rev-parse', 'HEAD'], { cwd: tmp });
  run('git', ['tag', TAG, head], { cwd: tmp });
  console.log(`✔ Shell bootstrap checkout ${tmp} tagged ${TAG} → ${head}`);
  return tmp;
}

async function main() {
  ensureAppTag();
  const shellGit = await materializeShellGitCheckout();

  const env = {
    ...process.env,
    G2RAIN_ALLOW_LOCAL_SYNC: '1',
    G2RAIN_TEMPLATE_SOURCE: appSource,
    G2RAIN_SHELL_TEMPLATE_SOURCE: shellGit,
    G2RAIN_APP_TEMPLATE_REF: TAG,
    G2RAIN_SHELL_TEMPLATE_REF: TAG,
  };

  console.log('→ sync:template');
  execFileSync(process.execPath, [path.join(root, 'scripts', 'sync-app-template.mjs')], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  console.log('→ sync:template:shell');
  execFileSync(process.execPath, [path.join(root, 'scripts', 'sync-shell-template.mjs')], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  console.log('→ verify:template-snapshots (no remote rebuild required)');
  execFileSync(
    process.execPath,
    [path.join(root, 'scripts', 'verify-template-snapshots.mjs')],
    {
      cwd: root,
      env: {
        ...env,
        G2RAIN_VERIFY_REQUIRE_REBUILD: undefined,
        GITHUB_ACTIONS: undefined,
      },
      stdio: 'inherit',
    },
  );

  console.log(`✔ Bootstrap complete with tag ${TAG}`);
  console.log('  Replace with protected upstream tags via sync-templates workflow when available.');
}

main().catch((error) => {
  console.error(`✖ ${error.message || error}`);
  process.exit(1);
});
