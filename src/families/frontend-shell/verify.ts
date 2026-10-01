import path from 'node:path';
import fs from 'fs-extra';

const REQUIRED_DOCS = [
  'AGENTS.md',
  'docs/project.yaml',
  'docs/index.md',
  'docs/architecture/overview.md',
  'docs/architecture/layers.md',
  'docs/architecture/dependencies.md',
  'docs/architecture/runtime-flows.md',
  'docs/architecture/deviations.md',
  'docs/development/local-development.md',
  'docs/development/testing.md',
  'docs/development/definition-of-done.md',
  'docs/development/platform-main-adoption.md',
  'docs/development/ui-theme-adoption.md',
  'docs/operations/configuration.md',
  'docs/operations/deployment.md',
  'docs/operations/troubleshooting.md',
  'docs/security/security-boundaries.md',
  'docs/requirements/README.md',
];

const REQUIRED_DIRS = [
  'src/shared',
  'src/components',
  'src/platform',
  'src/runtime',
  'src/views',
  'src/shell',
];

const LEGACY_REQUIRED = [
  'src/platform/legacy/registry.ts',
  'src/platform/legacy/adapter.ts',
  'src/platform/legacy/README.md',
  'src/platform/legacy/adapter.test.ts',
  'src/components/micro-app/legacy-message-bridge.ts',
  'src/runtime/shell-extensions.ts',
];

/** Post-scaffold checks for frontend-shell. */
export async function verifyFrontendShell(targetDir: string): Promise<void> {
  for (const relative of REQUIRED_DOCS) {
    if (!(await fs.pathExists(path.join(targetDir, relative)))) {
      throw new Error(`frontend-shell scaffold missing required file: ${relative}`);
    }
  }
  for (const relative of REQUIRED_DIRS) {
    if (!(await fs.pathExists(path.join(targetDir, relative)))) {
      throw new Error(`frontend-shell scaffold missing required directory: ${relative}`);
    }
  }

  const projectYaml = await fs.readFile(path.join(targetDir, 'docs/project.yaml'), 'utf-8');
  if (!/^family:\s*frontend-shell\s*$/m.test(projectYaml)) {
    throw new Error('frontend-shell scaffold must set family: frontend-shell in docs/project.yaml');
  }
  if (!/^generation:\s*$/m.test(projectYaml)) {
    throw new Error('frontend-shell scaffold must record generation metadata');
  }
  const generationBlock = projectYaml.match(/\r?\ngeneration:\r?\n([\s\S]*?)(?=\r?\n[a-zA-Z]|\r?\n*$)/)?.[1] ?? '';
  if (!/g2rain-shell-template/.test(generationBlock)) {
    throw new Error('frontend-shell generation.template must reference g2rain-shell-template');
  }
  if (/g2rain-main-shell/.test(generationBlock) || /g2rain-app-template/.test(generationBlock)) {
    throw new Error('frontend-shell generation.template must not use app-template or main-shell');
  }

  const legacyCompatibility = /^\s*legacyCompatibility:\s*(true|false)\s*$/m.exec(projectYaml)?.[1];
  if (legacyCompatibility !== 'true' && legacyCompatibility !== 'false') {
    throw new Error(
      'frontend-shell scaffold must set generation.legacyCompatibility to true or false',
    );
  }
  const withLegacy = legacyCompatibility === 'true';

  const legacyDir = path.join(targetDir, 'src/platform/legacy');
  if (!withLegacy) {
    if (await fs.pathExists(legacyDir)) {
      throw new Error(
        'frontend-shell default scaffold must not include src/platform/legacy/ (omit --with-legacy)',
      );
    }
  } else {
    for (const relative of LEGACY_REQUIRED) {
      if (!(await fs.pathExists(path.join(targetDir, relative)))) {
        throw new Error(`frontend-shell --with-legacy scaffold missing: ${relative}`);
      }
    }
    const extensions = await fs.readFile(
      path.join(targetDir, 'src/runtime/shell-extensions.ts'),
      'utf-8',
    );
    if (!/createLegacyAwareAdapterResolver/.test(extensions) || !/startLegacyMessageBridge/.test(extensions)) {
      throw new Error(
        'frontend-shell --with-legacy shell-extensions must install legacy resolver and message bridge',
      );
    }
  }

  const menuPath = path.join(targetDir, 'src/shell/menu.ts');
  if (await fs.pathExists(menuPath)) {
    const menu = await fs.readFile(menuPath, 'utf-8');
    if (/localhost:\d+/.test(menu) || /entry:\s*['"]http/.test(menu)) {
      throw new Error('frontend-shell template must not hardcode business micro-app entry URLs');
    }
  }
}
