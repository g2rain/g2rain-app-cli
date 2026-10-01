#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import { shouldCopyApp } from './lib/template-sync-filter.mjs';
import {
  APP_TEMPLATE_REPOSITORY,
  assertLocalSyncAllowed,
  resolveSourceCommit,
  writeSnapshotMarkers,
} from './lib/template-meta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const DEFAULT_SOURCE = path.resolve(root, '..', 'g2rain-app-template');

async function main() {
  assertLocalSyncAllowed();

  const sourceRoot = path.resolve(
    process.env.G2RAIN_TEMPLATE_SOURCE || DEFAULT_SOURCE,
  );
  const sourceRef = process.env.G2RAIN_APP_TEMPLATE_REF;
  if (!sourceRef) {
    console.error('✖ G2RAIN_APP_TEMPLATE_REF is required (Git tag, e.g. v0.2.0)');
    process.exit(1);
  }

  const targetRoot = path.join(root, 'template');

  if (!(await fse.pathExists(path.join(sourceRoot, 'package.json')))) {
    console.error(
      `✖ Template source not found or missing package.json: ${sourceRoot}`,
    );
    console.error(
      '  Set G2RAIN_TEMPLATE_SOURCE or place g2rain-app-template next to this repo.',
    );
    process.exit(1);
  }

  const sourceCommit = resolveSourceCommit(sourceRoot, sourceRef);

  await fse.remove(targetRoot);
  await fse.ensureDir(targetRoot);
  await fse.copy(sourceRoot, targetRoot, {
    filter: (src) => shouldCopyApp(src, sourceRoot),
  });

  const meta = await writeSnapshotMarkers({
    targetRoot,
    family: 'frontend-app',
    kind: 'app-base',
    sourceRepository: APP_TEMPLATE_REPOSITORY,
    sourceRef,
    sourceCommit,
  });

  console.log(`✔ Synced app template → ${targetRoot}`);
  console.log(`  source: ${sourceRoot}`);
  console.log(`  ref: ${sourceRef}`);
  console.log(`  commit: ${sourceCommit}`);
  console.log(`  contentSha256: ${meta.contentSha256}`);
}

main().catch((error) => {
  console.error(`✖ ${error.message || error}`);
  process.exit(1);
});
