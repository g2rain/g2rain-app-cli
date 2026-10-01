#!/usr/bin/env node
/**
 * Verify embedded template snapshots (meta v2, content hash, structure).
 *
 * Env:
 * - G2RAIN_VERIFY_REQUIRE_REBUILD=1 — fail if source cannot be rebuilt
 * - GITHUB_ACTIONS=true — same as require rebuild
 * - G2RAIN_TEMPLATE_SOURCE / G2RAIN_SHELL_TEMPLATE_SOURCE — local checkouts at meta commit
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import os from 'node:os';
import {
  shouldCopyApp,
  shouldCopyOverlay,
  shouldCopyShell,
} from './lib/template-sync-filter.mjs';
import {
  APP_TEMPLATE_REPOSITORY,
  assertMetaValid,
  assertSourceHeadMatches,
  META_FILENAME,
  readMetaFile,
  SHELL_TEMPLATE_REPOSITORY,
  SNAPSHOT_MARKDOWN_FILENAME,
} from './lib/template-meta.mjs';
import { hashTemplateTree } from './template-tree-hash.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const LEGACY_REQUIRED = [
  'src/platform/legacy/registry.ts',
  'src/platform/legacy/adapter.ts',
  'src/platform/legacy/resolve-instance.ts',
  'src/components/micro-app/legacy-message-bridge.ts',
  'src/runtime/shell-extensions.ts',
];

const SHELL_FORBIDDEN = [
  'legacy-overlay',
  'src/platform/legacy',
  'src/components/micro-app/legacy-message-bridge.ts',
];

async function verifySnapshotMetaAndHash(label, snapshotRoot, expected) {
  const meta = await readMetaFile(snapshotRoot);
  assertMetaValid(meta, expected);

  const markerMd = path.join(snapshotRoot, SNAPSHOT_MARKDOWN_FILENAME);
  if (!(await fse.pathExists(markerMd))) {
    throw new Error(`${label}: missing ${SNAPSHOT_MARKDOWN_FILENAME}`);
  }

  const actual = await hashTemplateTree(snapshotRoot);
  if (actual !== meta.contentSha256) {
    throw new Error(
      `${label}: contentSha256 mismatch\n  meta:   ${meta.contentSha256}\n  actual: ${actual}`,
    );
  }

  return meta;
}

async function assertNoForbidden(snapshotRoot, forbiddenRelPaths) {
  for (const rel of forbiddenRelPaths) {
    if (await fse.pathExists(path.join(snapshotRoot, rel))) {
      throw new Error(`Forbidden path present in snapshot: ${rel}`);
    }
  }
}

async function assertRequired(snapshotRoot, requiredRelPaths) {
  for (const rel of requiredRelPaths) {
    if (!(await fse.pathExists(path.join(snapshotRoot, rel)))) {
      throw new Error(`Missing required path in snapshot: ${rel}`);
    }
  }
}

/** @param {string} dir */
async function listContentFiles(dir) {
  /** @type {string[]} */
  const files = [];
  async function walk(abs, rel) {
    const entries = await fse.readdir(abs);
    for (const name of entries) {
      if (
        name === META_FILENAME ||
        name === SNAPSHOT_MARKDOWN_FILENAME ||
        name === 'node_modules' ||
        name === 'dist' ||
        name === '.git'
      ) {
        continue;
      }
      const child = path.join(abs, name);
      const childRel = rel ? `${rel}/${name}` : name;
      const st = await fse.lstat(child);
      if (st.isSymbolicLink()) {
        throw new Error(`Symlink not allowed: ${childRel}`);
      }
      if (st.isDirectory()) await walk(child, childRel);
      else if (st.isFile()) files.push(childRel);
    }
  }
  await walk(dir, '');
  files.sort();
  return files;
}

async function diffFilteredTrees(label, sourceRoot, snapshotRoot, filter) {
  const tmp = await fse.mkdtemp(path.join(os.tmpdir(), 'g2rain-rebuild-'));
  try {
    await fse.copy(sourceRoot, tmp, {
      filter: (src) => filter(src, sourceRoot),
    });

    const sourceFiles = await listContentFiles(tmp);
    const snapFiles = await listContentFiles(snapshotRoot);
    const sourceSet = new Set(sourceFiles);
    const snapSet = new Set(snapFiles);

    const onlySource = sourceFiles.filter((f) => !snapSet.has(f));
    const onlySnap = snapFiles.filter((f) => !sourceSet.has(f));
    const contentDiff = [];
    for (const rel of sourceFiles) {
      if (!snapSet.has(rel)) continue;
      const a = await fse.readFile(path.join(tmp, ...rel.split('/')));
      const b = await fse.readFile(path.join(snapshotRoot, ...rel.split('/')));
      if (!a.equals(b)) contentDiff.push(rel);
    }

    if (onlySource.length || onlySnap.length || contentDiff.length) {
      throw new Error(
        [
          `${label}: snapshot does not match rebuild from source`,
          onlySource.length
            ? `  only in source (${onlySource.length}): ${onlySource.slice(0, 20).join(', ')}`
            : '',
          onlySnap.length
            ? `  only in snapshot (${onlySnap.length}): ${onlySnap.slice(0, 20).join(', ')}`
            : '',
          contentDiff.length
            ? `  content differs (${contentDiff.length}): ${contentDiff.slice(0, 20).join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
  } finally {
    await fse.remove(tmp);
  }
}

function resolveGitRoot(envVar, defaultSibling) {
  return path.resolve(
    process.env[envVar] || path.join(root, '..', defaultSibling),
  );
}

async function maybeRebuild(label, meta, snapshotRoot, filter, envVar, siblingName, subdir) {
  const requireRebuild =
    process.env.G2RAIN_VERIFY_REQUIRE_REBUILD === '1' ||
    process.env.GITHUB_ACTIONS === 'true';

  const gitRoot = resolveGitRoot(envVar, siblingName);
  if (!(await fse.pathExists(gitRoot))) {
    if (requireRebuild) {
      throw new Error(
        `${label}: rebuild required but source missing at ${gitRoot}. Set ${envVar} to a checkout already at ${meta.sourceCommit}.`,
      );
    }
    console.warn(`⚠ ${label}: skip rebuild (source missing at ${gitRoot})`);
    return;
  }

  try {
    assertSourceHeadMatches(gitRoot, meta.sourceCommit, meta.sourceRef);
    const copyRoot = subdir ? path.join(gitRoot, subdir) : gitRoot;
    if (!(await fse.pathExists(copyRoot))) {
      throw new Error(`Missing ${copyRoot}`);
    }
    await diffFilteredTrees(label, copyRoot, snapshotRoot, filter);
    console.log(`✔ ${label}: rebuild matches snapshot`);
  } catch (error) {
    if (requireRebuild) throw error;
    console.warn(`⚠ ${label}: skip rebuild: ${error.message}`);
  }
}

async function main() {
  const appRoot = path.join(root, 'template');
  const shellRoot = path.join(root, 'template-shell');
  const legacyRoot = path.join(root, 'template-shell-legacy');

  if (!(await fse.pathExists(path.join(appRoot, 'package.json')))) {
    throw new Error('Missing embedded app template: template/package.json');
  }
  if (!(await fse.pathExists(path.join(shellRoot, 'package.json')))) {
    throw new Error('Missing embedded shell template: template-shell/package.json');
  }

  const appMeta = await verifySnapshotMetaAndHash('template/', appRoot, {
    family: 'frontend-app',
    kind: 'app-base',
    sourceRepository: APP_TEMPLATE_REPOSITORY,
  });
  console.log(`✔ template/ meta + hash OK (${appMeta.sourceRef})`);

  const shellMeta = await verifySnapshotMetaAndHash('template-shell/', shellRoot, {
    family: 'frontend-shell',
    kind: 'shell-base',
    sourceRepository: SHELL_TEMPLATE_REPOSITORY,
  });
  await assertNoForbidden(shellRoot, SHELL_FORBIDDEN);
  console.log(`✔ template-shell/ meta + hash + no-legacy OK (${shellMeta.sourceRef})`);

  const legacyMeta = await verifySnapshotMetaAndHash(
    'template-shell-legacy/',
    legacyRoot,
    {
      family: 'frontend-shell',
      kind: 'shell-legacy-overlay',
      sourceRepository: SHELL_TEMPLATE_REPOSITORY,
    },
  );
  await assertRequired(legacyRoot, LEGACY_REQUIRED);
  console.log(
    `✔ template-shell-legacy/ meta + hash + required files OK (${legacyMeta.sourceRef})`,
  );

  await maybeRebuild(
    'template/',
    appMeta,
    appRoot,
    shouldCopyApp,
    'G2RAIN_TEMPLATE_SOURCE',
    'g2rain-app-template',
  );
  await maybeRebuild(
    'template-shell/',
    shellMeta,
    shellRoot,
    shouldCopyShell,
    'G2RAIN_SHELL_TEMPLATE_SOURCE',
    'g2rain-shell-template',
  );
  await maybeRebuild(
    'template-shell-legacy/',
    legacyMeta,
    legacyRoot,
    shouldCopyOverlay,
    'G2RAIN_SHELL_TEMPLATE_SOURCE',
    'g2rain-shell-template',
    'legacy-overlay',
  );

  console.log('✔ All template snapshots verified');
}

main().catch((error) => {
  console.error(`✖ ${error.message || error}`);
  process.exit(1);
});
