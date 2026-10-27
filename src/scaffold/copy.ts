import path from 'node:path';
import fs from 'fs-extra';

const BLOCKED_BASENAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.idea',
  '.vscode',
  '.DS_Store',
  'package-lock.json',
  'Thumbs.db',
  '.g2rain-template-meta.json',
  '.g2rain-template-snapshot.md',
]);

const BLOCKED_EXTENSIONS = new Set(['.pem', '.der', '.p12', '.jks']);

function isLocalEnvFile(basename: string): boolean {
  return basename === '.env.local' || /^\.env\..+\.local$/.test(basename);
}

export function filterCopy(src: string): boolean {
  const basename = path.basename(src);
  if (BLOCKED_BASENAMES.has(basename)) return false;
  if (isLocalEnvFile(basename)) return false;
  if (BLOCKED_EXTENSIONS.has(path.extname(basename).toLowerCase())) return false;

  const parts = src.split(path.sep);
  const keysIdx = parts.lastIndexOf('keys');
  if (keysIdx > 0 && parts[keysIdx - 1] === 'lua') {
    // Allow the keys directory and README.md only
    if (keysIdx === parts.length - 1) return true;
    return basename === 'README.md';
  }

  return true;
}

/**
 * npm pack 会丢弃 .gitignore / .npmrc，快照内存为 _gitignore / _npmrc；
 * 须与 scripts/lib/template-sync-filter.mjs 的 DOTFILES 保持一致。
 */
export const DOTFILES = new Map([
  ['.gitignore', '_gitignore'],
  ['.npmrc', '_npmrc'],
]);

const RESTORED_DOTFILES = new Map([...DOTFILES].map(([name, stored]) => [stored, name]));

/** 把复制进来的 _gitignore / _npmrc 还原为 .gitignore / .npmrc。 */
async function restoreDotfiles(dir: string): Promise<void> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await restoreDotfiles(abs);
      continue;
    }
    const name = RESTORED_DOTFILES.get(entry.name);
    if (name) await fs.move(abs, path.join(dir, name), { overwrite: true });
  }
}

export async function copyTemplate(templateRoot: string, targetDir: string): Promise<void> {
  await fs.copy(templateRoot, targetDir, { filter: filterCopy });
  await restoreDotfiles(targetDir);
}

/**
 * Merge optional shell legacy overlay onto an already-copied shell project.
 * Overlay paths are relative to the project root (src/..., docs/...).
 */
export async function mergeLegacyOverlay(
  overlayRoot: string,
  targetDir: string,
): Promise<void> {
  if (!(await fs.pathExists(overlayRoot))) {
    throw new Error(`Legacy overlay not found: ${overlayRoot}`);
  }
  await fs.copy(overlayRoot, targetDir, { filter: filterCopy });
  await restoreDotfiles(targetDir);
}
