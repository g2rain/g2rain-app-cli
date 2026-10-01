import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { getFamily } from '../families/registry.js';
import type { FamilyId } from '../families/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Package root: dist/scaffold → ../.. */
export function resolvePackageRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

export function resolveBundledTemplateRoot(family: FamilyId = 'frontend-app'): string {
  const definition = getFamily(family);
  return path.join(resolvePackageRoot(), definition.bundledTemplateDir);
}

export async function resolveTemplateRoot(family: FamilyId = 'frontend-app'): Promise<string> {
  const definition = getFamily(family);
  const fromEnv = process.env[definition.templateEnvVar]?.trim();
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (!(await fs.pathExists(path.join(resolved, 'package.json')))) {
      throw new Error(
        `${definition.templateEnvVar} does not contain package.json: ${resolved}`,
      );
    }
    return resolved;
  }

  const bundled = resolveBundledTemplateRoot(family);
  if (!(await fs.pathExists(path.join(bundled, 'package.json')))) {
    throw new Error(
      `Bundled template not found at ${bundled}. Run npm run sync:template` +
        (family === 'frontend-shell' ? ':shell' : '') +
        ` or set ${definition.templateEnvVar}.`,
    );
  }
  return bundled;
}

/**
 * Resolve shell legacy overlay root for `--with-legacy`.
 * Prefer `<shellTemplateRoot>/legacy-overlay` when using a source checkout;
 * otherwise use the bundled `template-shell-legacy/` snapshot.
 */
export async function resolveLegacyOverlayRoot(shellTemplateRoot: string): Promise<string> {
  const sibling = path.join(shellTemplateRoot, 'legacy-overlay');
  if (await fs.pathExists(path.join(sibling, 'src', 'platform', 'legacy', 'registry.ts'))) {
    return sibling;
  }

  const bundled = path.join(resolvePackageRoot(), 'template-shell-legacy');
  if (await fs.pathExists(path.join(bundled, 'src', 'platform', 'legacy', 'registry.ts'))) {
    return bundled;
  }

  throw new Error(
    'Legacy overlay not found. Run npm run sync:template:shell (expects g2rain-shell-template/legacy-overlay) ' +
      'or point G2RAIN_SHELL_TEMPLATE_PATH at a shell-template checkout that contains legacy-overlay/.',
  );
}
