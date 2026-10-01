#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import {
  shouldCopyOverlay,
  shouldCopyShell,
} from './lib/template-sync-filter.mjs';
import {
  assertLocalSyncAllowed,
  resolveSourceCommit,
  SHELL_TEMPLATE_REPOSITORY,
  writeSnapshotMarkers,
} from './lib/template-meta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const DEFAULT_SOURCE = path.resolve(root, '..', 'g2rain-shell-template');

async function main() {
  assertLocalSyncAllowed();

  const sourceRoot = path.resolve(
    process.env.G2RAIN_SHELL_TEMPLATE_SOURCE || DEFAULT_SOURCE,
  );
  const sourceRef = process.env.G2RAIN_SHELL_TEMPLATE_REF;
  if (!sourceRef) {
    console.error(
      '✖ G2RAIN_SHELL_TEMPLATE_REF is required (Git tag, e.g. v0.2.0)',
    );
    process.exit(1);
  }

  const targetRoot = path.join(root, 'template-shell');
  const overlaySource = path.join(sourceRoot, 'legacy-overlay');
  const overlayTarget = path.join(root, 'template-shell-legacy');

  if (!(await fse.pathExists(path.join(sourceRoot, 'package.json')))) {
    console.error(
      `✖ Shell template source not found or missing package.json: ${sourceRoot}`,
    );
    console.error(
      '  Set G2RAIN_SHELL_TEMPLATE_SOURCE or place g2rain-shell-template next to this repo.',
    );
    process.exit(1);
  }

  if (!(await fse.pathExists(overlaySource))) {
    console.error(
      `✖ Missing legacy-overlay at ${overlaySource}; refused to sync without overlay snapshot.`,
    );
    process.exit(1);
  }

  const sourceCommit = resolveSourceCommit(sourceRoot, sourceRef);

  await fse.remove(targetRoot);
  await fse.ensureDir(targetRoot);
  await fse.copy(sourceRoot, targetRoot, {
    filter: (src) => shouldCopyShell(src, sourceRoot),
  });

  if (await fse.pathExists(path.join(targetRoot, 'legacy-overlay'))) {
    console.error('✖ template-shell must not contain legacy-overlay/ after sync');
    process.exit(1);
  }

  const shellMeta = await writeSnapshotMarkers({
    targetRoot,
    family: 'frontend-shell',
    kind: 'shell-base',
    sourceRepository: SHELL_TEMPLATE_REPOSITORY,
    sourceRef,
    sourceCommit,
  });

  console.log(`✔ Synced shell template → ${targetRoot}`);
  console.log(`  source: ${sourceRoot}`);
  console.log(`  ref: ${sourceRef}`);
  console.log(`  commit: ${sourceCommit}`);
  console.log(`  contentSha256: ${shellMeta.contentSha256}`);

  await fse.remove(overlayTarget);
  await fse.ensureDir(overlayTarget);
  await fse.copy(overlaySource, overlayTarget, {
    filter: (src) => shouldCopyOverlay(src, overlaySource),
  });

  const legacyMeta = await writeSnapshotMarkers({
    targetRoot: overlayTarget,
    family: 'frontend-shell',
    kind: 'shell-legacy-overlay',
    sourceRepository: SHELL_TEMPLATE_REPOSITORY,
    sourceRef,
    sourceCommit,
  });

  console.log(`✔ Synced shell legacy overlay → ${overlayTarget}`);
  console.log(`  contentSha256: ${legacyMeta.contentSha256}`);
}

main().catch((error) => {
  console.error(`✖ ${error.message || error}`);
  process.exit(1);
});
