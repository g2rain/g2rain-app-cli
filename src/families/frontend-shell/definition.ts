import type { FamilyDefinition } from '../types.js';
import { rewriteFrontendShellIdentity } from './identity.js';
import {
  replaceFrontendShellPlaceholders,
  rewriteFrontendShellPackageJson,
} from './placeholders.js';
import { verifyFrontendShell } from './verify.js';

export const frontendShellFamily: FamilyDefinition = {
  id: 'frontend-shell',
  alias: 'shell',
  label: 'Main Shell (frontend-shell)',
  bundledTemplateDir: 'template-shell',
  templateEnvVar: 'G2RAIN_SHELL_TEMPLATE_PATH',
  templateRepository: 'https://github.com/g2rain/g2rain-shell-template',
  defaultContextPath: () => 'admin',
  defaultPort: 3000,
  helpText: `Usage: create-g2rain-app shell <project-name> [options]
       create-g2rain-app --family frontend-shell --name <project-name> [options]

Create a G2rain Main Shell (frontend-shell) from g2rain-shell-template.

Options:
  --context-path <path>   URL prefix without leading slash (default: admin)
  --port <number>         Dev server port (default: 3000)
  --with-legacy           Include optional legacy overlay (Token-in-props bridge)
  --name <project-name>   Project directory / package name
  --help                  Show this help

Notes:
  - Does NOT use g2rain-app-template or @g2rain/platform/sub lifecycle.
  - Uses @g2rain/platform/main + @g2rain/http + theme/ui composition-root hooks.
  - Baseline menus are Shell-local only; no hardcoded business micro-app entries.
  - Default scaffold is AppKit-only; --with-legacy merges template-shell-legacy.
  - Override template with G2RAIN_SHELL_TEMPLATE_PATH for local development.
  - Uses published @g2rain/* package versions declared by the template.
`,
  rewriteIdentity: rewriteFrontendShellIdentity,
  rewritePackageJson: rewriteFrontendShellPackageJson,
  replacePlaceholders: replaceFrontendShellPlaceholders,
  verify: verifyFrontendShell,
  nextSteps: (options) => {
    const steps = [
      `cd ${options.projectName}`,
      'npm install',
      'npm run dev',
    ];
    if (options.withLegacy) {
      steps.push(
        '# Legacy: register applicationCode in src/platform/legacy/registry.ts',
        'npm run test:legacy',
      );
    }
    return steps;
  },
};
