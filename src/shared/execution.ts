import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

/**
 * Detect whether this process was started as the CLI bin entry.
 * `modulePath` may be dist/index.js (tests) or dist/shared/execution.js (runtime default).
 */
export function isDirectExecution(
  entryPath = process.argv[1],
  modulePath = fileURLToPath(import.meta.url),
): boolean {
  if (!entryPath) return false;
  const resolvedModule = path.resolve(modulePath);
  const indexPath = /(^|[\\/])index\.js$/i.test(resolvedModule)
    ? resolvedModule
    : path.resolve(path.dirname(resolvedModule), '..', 'index.js');
  try {
    return fs.realpathSync(entryPath) === fs.realpathSync(indexPath);
  } catch {
    return path.resolve(entryPath) === path.resolve(indexPath);
  }
}
