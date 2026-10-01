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

export async function copyTemplate(templateRoot: string, targetDir: string): Promise<void> {
  await fs.copy(templateRoot, targetDir, { filter: filterCopy });
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
}
