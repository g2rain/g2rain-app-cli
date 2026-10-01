import path from 'node:path';

const COMMON_BLOCKED_BASENAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.idea',
  '.vscode',
  '.DS_Store',
  'package-lock.json',
  'Thumbs.db',
]);

const APP_BLOCKED_BASENAMES = new Set([
  ...COMMON_BLOCKED_BASENAMES,
  'ARCHITECHTURE.md',
  'ARCHITECTURE_SPEC.md',
]);

const SHELL_BLOCKED_BASENAMES = new Set([
  ...COMMON_BLOCKED_BASENAMES,
  'legacy-overlay',
]);

const OVERLAY_BLOCKED_BASENAMES = new Set([...COMMON_BLOCKED_BASENAMES]);

const BLOCKED_EXTENSIONS = new Set(['.pem', '.der', '.p12', '.jks']);
const SHELL_BLOCKED_EXTENSIONS = new Set(['.pem', '.der', '.p12', '.jks', '.tgz']);

/** Marker files written into CLI snapshots; never part of source-tree content hash input either. */
export const SNAPSHOT_MARKER_BASENAMES = new Set([
  '.g2rain-template-meta.json',
  '.g2rain-template-snapshot.md',
]);

/** Basenames excluded from content tree hash (in addition to walk skips). */
export const TREE_HASH_EXCLUDED_BASENAMES = new Set([
  ...SNAPSHOT_MARKER_BASENAMES,
  '.git',
  'node_modules',
  'dist',
]);

function isLocalEnvFile(basename) {
  return basename === '.env.local' || /^\.env\..+\.local$/.test(basename);
}

function relativeParts(src, sourceRoot) {
  const relative = path.relative(sourceRoot, src);
  if (!relative || relative === '.') return null;
  return relative.split(path.sep);
}

function blockedByBasename(parts, blocked) {
  for (const part of parts) {
    if (blocked.has(part)) return true;
  }
  return false;
}

function allowLuaKeysReadme(parts) {
  const keysIdx = parts.findIndex((p) => p === 'keys');
  if (keysIdx < 0 || parts[keysIdx - 1] !== 'lua') return null;
  const afterKeys = parts.slice(keysIdx + 1);
  if (afterKeys.length === 0) return true;
  return afterKeys.length === 1 && afterKeys[0] === 'README.md';
}

/**
 * Filter for copying g2rain-app-template → template/
 * @param {string} src
 * @param {string} sourceRoot
 */
export function shouldCopyApp(src, sourceRoot) {
  const parts = relativeParts(src, sourceRoot);
  if (!parts) return true;
  if (blockedByBasename(parts, APP_BLOCKED_BASENAMES)) return false;

  const basename = path.basename(src);
  if (isLocalEnvFile(basename)) return false;
  if (BLOCKED_EXTENSIONS.has(path.extname(basename).toLowerCase())) return false;

  const luaKeys = allowLuaKeysReadme(parts);
  if (luaKeys !== null) return luaKeys;

  return true;
}

/**
 * Filter for copying g2rain-shell-template root → template-shell/
 * Excludes legacy-overlay/; allows kits/*.tgz.
 * @param {string} src
 * @param {string} sourceRoot
 */
export function shouldCopyShell(src, sourceRoot) {
  const parts = relativeParts(src, sourceRoot);
  if (!parts) return true;
  if (blockedByBasename(parts, SHELL_BLOCKED_BASENAMES)) return false;

  const basename = path.basename(src);
  if (isLocalEnvFile(basename)) return false;

  // kits/*.tgz are required for Docker file: dependencies until npm registry.
  if (parts[0] === 'kits' && basename.endsWith('.tgz')) {
    return true;
  }

  if (SHELL_BLOCKED_EXTENSIONS.has(path.extname(basename).toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Filter for copying legacy-overlay/ → template-shell-legacy/
 * @param {string} src
 * @param {string} overlayRoot
 */
export function shouldCopyOverlay(src, overlayRoot) {
  const parts = relativeParts(src, overlayRoot);
  if (!parts) return true;
  if (blockedByBasename(parts, OVERLAY_BLOCKED_BASENAMES)) return false;

  const basename = path.basename(src);
  if (isLocalEnvFile(basename)) return false;
  if (SHELL_BLOCKED_EXTENSIONS.has(path.extname(basename).toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Whether a relative POSIX path inside an already-synced snapshot should be
 * included in the content tree hash.
 * @param {string} posixRelative
 */
export function includeInTreeHash(posixRelative) {
  if (!posixRelative || posixRelative === '.') return false;
  const parts = posixRelative.split('/');
  for (const part of parts) {
    if (TREE_HASH_EXCLUDED_BASENAMES.has(part)) return false;
  }
  return true;
}
