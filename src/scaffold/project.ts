import fs from 'fs-extra';
import { getFamily } from '../families/registry.js';
import type { FamilyId } from '../families/types.js';
import { resolveGenerationIdentity } from './template-source.js';
import type { TemplateVars } from './types.js';
import { copyTemplate, mergeLegacyOverlay } from './copy.js';
import { resolveLegacyOverlayRoot } from './resolve-template-root.js';

export async function scaffoldProject(
  templateRoot: string,
  targetDir: string,
  vars: TemplateVars,
): Promise<void> {
  const familyId: FamilyId = vars.family ?? 'frontend-app';
  const family = getFamily(familyId);
  const withLegacy = Boolean(vars.withLegacy);

  if (withLegacy && familyId !== 'frontend-shell') {
    throw new Error('--with-legacy is only supported for frontend-shell');
  }

  // 目标目录原先不存在时，任一步失败后清掉半成品，避免再次运行被「已存在」挡住
  const createdHere = !(await fs.pathExists(targetDir));
  try {
    await copyTemplate(templateRoot, targetDir);

    if (withLegacy) {
      const overlayRoot = await resolveLegacyOverlayRoot(templateRoot);
      await mergeLegacyOverlay(overlayRoot, targetDir);
    }

    await family.rewritePackageJson(targetDir, vars.projectName);
    await family.replacePlaceholders(targetDir, {
      projectName: vars.projectName,
      contextPath: vars.contextPath,
      port: vars.port ?? family.defaultPort,
    });
    const generationIdentity = await resolveGenerationIdentity(templateRoot, {
      ...vars,
      family: familyId,
      port: vars.port ?? family.defaultPort,
      withLegacy,
    }, family.templateRepository);
    await family.rewriteIdentity(targetDir, generationIdentity);
    await family.verify(targetDir);
  } catch (error) {
    if (createdHere) {
      await fs.remove(targetDir).catch(() => undefined);
    }
    throw error;
  }
}
