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
}
