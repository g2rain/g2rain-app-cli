import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fse from 'fs-extra';
import { hashTemplateTree } from '../template-tree-hash.mjs';

export const META_SCHEMA_VERSION = 2;
export const META_FILENAME = '.g2rain-template-meta.json';
export const SNAPSHOT_MARKDOWN_FILENAME = '.g2rain-template-snapshot.md';

/** @type {RegExp} */
export const TEMPLATE_TAG_PATTERN =
  /^v\d+\.(?:\d+)\.(?:\d+)(?:-[0-9A-Za-z.-]+)?$/;

export const APP_TEMPLATE_REPOSITORY = 'https://github.com/g2rain/g2rain-app-template';
export const SHELL_TEMPLATE_REPOSITORY =
  'https://github.com/g2rain/g2rain-shell-template';

/**
 * @typedef {'frontend-app' | 'frontend-shell'} TemplateFamily
 * @typedef {'app-base' | 'shell-base' | 'shell-legacy-overlay'} TemplateKind
 */

/**
 * @param {string} ref
 * @returns {boolean}
 */
export function isValidTemplateTag(ref) {
  return TEMPLATE_TAG_PATTERN.test(ref);
}

/**
 * Resolve a Git tag to a full 40-char commit SHA.
 * Requires refs/tags/<ref> (a same-named branch is not enough).
 * @param {string} sourceRoot
 * @param {string} ref
 * @returns {string}
 */
export function resolveSourceCommit(sourceRoot, ref) {
  if (!ref || ref === 'unknown' || ref === 'main' || ref === 'master') {
    throw new Error(`Invalid template ref: ${ref}`);
  }
  if (!isValidTemplateTag(ref)) {
    throw new Error(
      `Template ref must match v<major>.<minor>.<patch>[-prerelease], got: ${ref}`,
    );
  }

  const tagRef = `refs/tags/${ref}`;
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', tagRef], {
      cwd: sourceRoot,
      encoding: 'utf-8',
    });
  } catch {
    throw new Error(
      `Template ref must be a Git tag (${tagRef}) in ${sourceRoot}; branches or other refs are not accepted.`,
    );
  }

  let commit;
  try {
    commit = execFileSync('git', ['rev-parse', '--verify', `${tagRef}^{commit}`], {
      cwd: sourceRoot,
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    throw new Error(
      `Failed to resolve ${tagRef}^{commit} in ${sourceRoot}: ${error.message}`,
    );
  }

  if (!/^[0-9a-f]{40}$/i.test(commit)) {
    throw new Error(`Expected 40-char commit SHA for ${ref}, got: ${commit}`);
  }

  assertSourceHeadMatches(sourceRoot, commit, ref);
  return commit.toLowerCase();
}

/**
 * Read-only check: source checkout HEAD must already be the expected commit.
 * Never runs git checkout / reset.
 * @param {string} sourceRoot
 * @param {string} commit
 * @param {string} ref
 */
export function assertSourceHeadMatches(sourceRoot, commit, ref) {
  if (!fse.existsSync(sourceRoot)) {
    throw new Error(`Source not found: ${sourceRoot}`);
  }
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: sourceRoot,
    encoding: 'utf-8',
  }).trim();
  if (head.toLowerCase() !== commit.toLowerCase()) {
    throw new Error(
      `Source at ${sourceRoot} HEAD is ${head}, expected ${commit} (${ref}). Snapshot verify never checks out source repositories; point G2RAIN_*_SOURCE at a clean clone/worktree already on that commit.`,
    );
  }
}

/**
 * Gate local sync: CI (GITHUB_ACTIONS) always allowed; local requires env.
 * @returns {void}
 */
export function assertLocalSyncAllowed() {
  if (process.env.GITHUB_ACTIONS === 'true') return;
  if (process.env.G2RAIN_ALLOW_LOCAL_SYNC === '1') return;
  throw new Error(
    'Local template sync is blocked. Set G2RAIN_ALLOW_LOCAL_SYNC=1 for troubleshooting, or run the sync-templates GitHub Actions workflow.',
  );
}

/**
 * @param {object} options
 * @param {TemplateFamily} options.family
 * @param {TemplateKind} options.kind
 * @param {string} options.sourceRepository
 * @param {string} options.sourceRef
 * @param {string} options.sourceCommit
 * @param {string} options.contentSha256
 * @param {string} [options.syncedAt]
 * @param {string} [options.syncWorkflow]
 */
export function buildMetaV2(options) {
  return {
    schemaVersion: META_SCHEMA_VERSION,
    managed: true,
    family: options.family,
    kind: options.kind,
    sourceRepository: options.sourceRepository,
    sourceRef: options.sourceRef,
    sourceCommit: options.sourceCommit,
    contentSha256: options.contentSha256,
    syncedAt: options.syncedAt || new Date().toISOString(),
    syncWorkflow:
      options.syncWorkflow || '.github/workflows/sync-templates.yml',
  };
}

/**
 * Normalize legacy v1 or v2 meta for readers.
 * @param {Record<string, unknown> | undefined} raw
 */
export function normalizeMeta(raw) {
  if (!raw || typeof raw !== 'object') return undefined;

  const sourceRepository =
    typeof raw.sourceRepository === 'string'
      ? raw.sourceRepository
      : typeof raw.repository === 'string'
        ? raw.repository
        : undefined;

  const sourceCommit =
    typeof raw.sourceCommit === 'string'
      ? raw.sourceCommit
      : typeof raw.commit === 'string'
        ? raw.commit
        : undefined;

  const sourceRef =
    typeof raw.sourceRef === 'string'
      ? raw.sourceRef
      : undefined;

  return {
    schemaVersion:
      typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1,
    managed: raw.managed === true,
    family: typeof raw.family === 'string' ? raw.family : undefined,
    kind: typeof raw.kind === 'string' ? raw.kind : undefined,
    sourceRepository,
    sourceRef,
    sourceCommit,
    contentSha256:
      typeof raw.contentSha256 === 'string' ? raw.contentSha256 : undefined,
    syncedAt: typeof raw.syncedAt === 'string' ? raw.syncedAt : undefined,
    syncWorkflow:
      typeof raw.syncWorkflow === 'string' ? raw.syncWorkflow : undefined,
  };
}

/**
 * @param {string} snapshotRoot
 * @returns {Promise<ReturnType<typeof normalizeMeta>>}
 */
export async function readMetaFile(snapshotRoot) {
  const metaPath = path.join(snapshotRoot, META_FILENAME);
  if (!(await fse.pathExists(metaPath))) return undefined;
  try {
    return normalizeMeta(await fse.readJson(metaPath));
  } catch {
    return undefined;
  }
}

/**
 * @param {object} options
 * @param {string} options.sourceRepository
 * @param {string} options.sourceRef
 * @param {string} options.sourceCommit
 * @param {TemplateKind} options.kind
 */
export function buildSnapshotMarkdown(options) {
  const repoShort = options.sourceRepository.replace(
    /^https:\/\/github\.com\//,
    '',
  );
  const lines = [
    '# Generated template snapshot — do not edit',
    '',
    'This directory is managed by the g2rain-app-cli template synchronization workflow.',
    '',
    `Source repository: ${repoShort}`,
    `Source ref: ${options.sourceRef}`,
    `Source commit: ${options.sourceCommit}`,
    `Snapshot kind: ${options.kind}`,
    '',
    'Do not edit files in this directory directly.',
    '',
    'To change this template:',
    '1. Change and validate the source template repository.',
    '2. Create a protected Git tag and GitHub Release.',
    "3. Run g2rain-app-cli's sync-templates workflow with that tag.",
    '4. Review and merge the generated synchronization PR.',
    '',
    'Direct edits will fail snapshot verification in CI.',
  ];

  if (options.kind === 'shell-legacy-overlay') {
    lines.push(
      '',
      'This is the optional `--with-legacy` overlay.',
      'It must never be merged into the default Shell template.',
    );
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Write meta v2 + snapshot markdown after content is in place.
 * @param {object} options
 * @param {string} options.targetRoot
 * @param {TemplateFamily} options.family
 * @param {TemplateKind} options.kind
 * @param {string} options.sourceRepository
 * @param {string} options.sourceRef
 * @param {string} options.sourceCommit
 */
export async function writeSnapshotMarkers(options) {
  const contentSha256 = await hashTemplateTree(options.targetRoot);
  const meta = buildMetaV2({
    family: options.family,
    kind: options.kind,
    sourceRepository: options.sourceRepository,
    sourceRef: options.sourceRef,
    sourceCommit: options.sourceCommit,
    contentSha256,
  });

  await fse.writeJson(path.join(options.targetRoot, META_FILENAME), meta, {
    spaces: 2,
  });
  await fse.writeFile(
    path.join(options.targetRoot, SNAPSHOT_MARKDOWN_FILENAME),
    buildSnapshotMarkdown({
      sourceRepository: options.sourceRepository,
      sourceRef: options.sourceRef,
      sourceCommit: options.sourceCommit,
      kind: options.kind,
    }),
    'utf-8',
  );

  return meta;
}

/**
 * Validate a v2 meta object for CI / prepublish.
 * @param {ReturnType<typeof normalizeMeta>} meta
 * @param {{ family: TemplateFamily, kind: TemplateKind, sourceRepository: string }} expected
 */
export function assertMetaValid(meta, expected) {
  if (!meta) throw new Error('Missing template meta');
  if (meta.schemaVersion !== META_SCHEMA_VERSION) {
    throw new Error(
      `Expected schemaVersion ${META_SCHEMA_VERSION}, got ${meta.schemaVersion}`,
    );
  }
  if (meta.managed !== true) throw new Error('meta.managed must be true');
  if (meta.family !== expected.family) {
    throw new Error(`Expected family ${expected.family}, got ${meta.family}`);
  }
  if (meta.kind !== expected.kind) {
    throw new Error(`Expected kind ${expected.kind}, got ${meta.kind}`);
  }
  if (meta.sourceRepository !== expected.sourceRepository) {
    throw new Error(
      `Expected sourceRepository ${expected.sourceRepository}, got ${meta.sourceRepository}`,
    );
  }
  if (!meta.sourceRef || !isValidTemplateTag(meta.sourceRef)) {
    throw new Error(`Invalid sourceRef: ${meta.sourceRef}`);
  }
  if (!meta.sourceCommit || !/^[0-9a-f]{40}$/i.test(meta.sourceCommit)) {
    throw new Error(`Invalid sourceCommit: ${meta.sourceCommit}`);
  }
  if (meta.sourceCommit === 'unknown') {
    throw new Error('sourceCommit must not be unknown');
  }
  if (!meta.contentSha256 || !/^sha256:[0-9a-f]{64}$/i.test(meta.contentSha256)) {
    throw new Error(`Invalid contentSha256: ${meta.contentSha256}`);
  }
}
