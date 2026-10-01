import path from 'node:path';
import fs from 'fs-extra';
import kleur from 'kleur';
import prompts from 'prompts';
import { parseCreateArgs } from '../cli/parse.js';
import { getFamily, printRootHelp } from '../families/registry.js';
import type { FamilyAlias, FamilyId } from '../families/types.js';
import { scaffoldProject } from '../scaffold/project.js';
import { resolveTemplateRoot } from '../scaffold/resolve-template-root.js';

function normalizeContextPath(input: string): string {
  const normalized = input.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    throw new Error('Context path cannot be empty');
  }
  return normalized;
}

async function ensureProjectName(family: FamilyId, initial?: string) {
  if (initial) return initial;
  const { name } = await prompts({
    type: 'text',
    name: 'name',
    message: 'Project name',
    initial: family === 'frontend-shell' ? 'g2rain-new-shell' : 'g2rain-new-app',
  });
  return name;
}

async function ensureContextPath(
  family: FamilyId,
  projectName: string,
  initial?: string,
) {
  const definition = getFamily(family);
  if (initial) return normalizeContextPath(initial);

  if (family === 'frontend-shell' && definition.defaultContextPath) {
    // Non-interactive default for shell; still prompt when TTY for consistency with app.
    const { contextPath } = await prompts({
      type: 'text',
      name: 'contextPath',
      message: 'Context path (URL prefix, without leading slash)',
      initial: definition.defaultContextPath(projectName),
    });
    if (!contextPath) {
      throw new Error('Context path is required');
    }
    return normalizeContextPath(contextPath);
  }

  const { contextPath } = await prompts({
    type: 'text',
    name: 'contextPath',
    message: 'Context path (URL prefix, without leading slash)',
    initial: definition.defaultContextPath(projectName),
  });

  if (!contextPath) {
    throw new Error('Context path is required');
  }

  return normalizeContextPath(contextPath);
}

export async function runCreate(
  argv: string[],
  familyAlias?: FamilyAlias,
): Promise<void> {
  let parsed;
  try {
    parsed = parseCreateArgs(argv, familyAlias);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid arguments';
    console.error(kleur.red(`✖ ${message}`));
    process.exit(1);
  }

  const familyId = parsed.family ?? 'frontend-app';
  const family = getFamily(familyId);

  if (parsed.help) {
    console.log(family.helpText);
    return;
  }

  if (!parsed.familyExplicit) {
    console.log(
      kleur.yellow(
        'ℹ Family not specified; defaulting to frontend-app (business sub-app). Use `app` / `shell` or `--family` to choose explicitly.',
      ),
    );
  }

  let projectName: string | undefined;
  let contextPath: string;
  let port = parsed.port ?? family.defaultPort;

  try {
    projectName = await ensureProjectName(familyId, parsed.projectName);
    if (!projectName) {
      console.error(kleur.red('✖ Project name is required'));
      process.exit(1);
    }
    contextPath = await ensureContextPath(familyId, projectName, parsed.contextPath);
    if (familyId === 'frontend-shell' && port === undefined) {
      port = 3000;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid arguments';
    console.error(kleur.red(`✖ ${message}`));
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(targetDir)) {
    console.error(kleur.red(`✖ Target directory already exists: ${targetDir}`));
    process.exit(1);
  }

  let templateRoot: string;
  try {
    templateRoot = await resolveTemplateRoot(familyId);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to resolve template';
    console.error(kleur.red(`✖ ${message}`));
    process.exit(1);
  }

  console.log(kleur.cyan(`➜ Family: ${family.id} (${family.label})`));
  console.log(kleur.cyan(`➜ Using template: ${templateRoot}`));
  if (parsed.withLegacy) {
    console.log(kleur.yellow('➜ Merging legacy overlay (template-shell-legacy)'));
  }
  await scaffoldProject(templateRoot, targetDir, {
    projectName,
    contextPath,
    family: familyId,
    port,
    withLegacy: parsed.withLegacy,
  });

  console.log(kleur.green(`\n✔ Project created at ${targetDir}`));
  console.log(kleur.cyan(`  family: ${familyId}`));
  console.log(kleur.cyan(`  context path: /${contextPath}`));
  if (port !== undefined) {
    console.log(kleur.cyan(`  port: ${port}`));
  }
  if (parsed.withLegacy) {
    console.log(kleur.cyan('  legacyCompatibility: true'));
  }
  console.log('\nNext steps:');
  for (const step of family.nextSteps({
    family: familyId,
    familyExplicit: parsed.familyExplicit,
    projectName,
    contextPath,
    port,
    withLegacy: parsed.withLegacy,
  })) {
    console.log(`  ${step}`);
  }
  console.log(
    `\nTip: set ${family.templateEnvVar} to override the bundled template during local development.`,
  );
}

export function runHelp(args: string[]): void {
  const first = args[0];
  if (first === 'app' || first === 'frontend-app') {
    console.log(getFamily('frontend-app').helpText);
    return;
  }
  if (first === 'shell' || first === 'frontend-shell') {
    console.log(getFamily('frontend-shell').helpText);
    return;
  }
  console.log(printRootHelp());
}
