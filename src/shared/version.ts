import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');

/** 读取 CLI 自身 package.json 的 version。 */
export async function readCliVersion(): Promise<string> {
  const pkg = await fs.readJson(pkgPath);
  return String(pkg.version);
}
