import fsp from 'node:fs/promises';
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

/**
 * npm pack 总会丢弃 .gitignore / .npmrc，快照内改存为下列名称；
 * 脚手架复制时还原（src/scaffold/copy.ts 的 DOTFILES 须保持一致）。
 */
export const DOTFILES = new Map([
  ['.gitignore', '_gitignore'],
  ['.npmrc', '_npmrc'],
]);

const RESTORED_DOTFILES = new Map([...DOTFILES].map(([name, stored]) => [stored, name]));

/**
 * 快照内 POSIX 相对路径 → 源仓（逻辑）路径；树哈希按逻辑路径计算，与源仓一致。
 * @param {string} posixRelative
 */
export function toSourcePath(posixRelative) {
  const parts = posixRelative.split('/');
  const name = RESTORED_DOTFILES.get(parts.at(-1));
  if (name) parts[parts.length - 1] = name;
  return parts.join('/');
}

/**
 * 同步后把快照目录中的 .gitignore / .npmrc 改名为 _gitignore / _npmrc。
 * 源仓若已有同名 _gitignore / _npmrc 则失败，避免还原时互相覆盖。
 * @param {string} root
 */
export async function storeDotfiles(root) {
  const entries = await fsp.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await storeDotfiles(abs);
      continue;
    }
    if (RESTORED_DOTFILES.has(entry.name)) {
      throw new Error(`Reserved snapshot file name in template source: ${abs}`);
    }
  }
  for (const entry of entries) {
    const stored = entry.isFile() ? DOTFILES.get(entry.name) : undefined;
    if (stored) await fsp.rename(path.join(root, entry.name), path.join(root, stored));
  }
}

function isLocalEnvFile(basename) {
  return basename === '.env.local' || /^\.env\..+\.local$/.test(basename);
}

/** Generated locally when shell signing keys are provisioned; never snapshot it. */
function isLocalSigningKeyMetadata(parts) {
  return (
    parts.length >= 3 &&
    parts.at(-1) === 'iam-key-id.txt' &&
    parts.at(-2) === 'keys' &&
    parts.at(-3) === 'lua'
  );
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
  if (isLocalSigningKeyMetadata(parts)) return false;
  if (BLOCKED_EXTENSIONS.has(path.extname(basename).toLowerCase())) return false;

  const luaKeys = allowLuaKeysReadme(parts);
  if (luaKeys !== null) return luaKeys;

  return true;
}

/**
 * Filter for copying g2rain-shell-template root → template-shell/
 * Excludes legacy-overlay/ and local package archives.
 * @param {string} src
 * @param {string} sourceRoot
 */
export function shouldCopyShell(src, sourceRoot) {
  const parts = relativeParts(src, sourceRoot);
  if (!parts) return true;
  if (blockedByBasename(parts, SHELL_BLOCKED_BASENAMES)) return false;

  const basename = path.basename(src);
  if (isLocalEnvFile(basename)) return false;
  if (isLocalSigningKeyMetadata(parts)) return false;

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
  if (isLocalSigningKeyMetadata(parts)) return false;
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
  if (isLocalSigningKeyMetadata(parts)) return false;
  for (const part of parts) {
    if (TREE_HASH_EXCLUDED_BASENAMES.has(part)) return false;
  }
  return true;
}
