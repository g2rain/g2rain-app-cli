import type { FamilyDefinition } from '../types.js';
import { rewriteFrontendAppIdentity } from './identity.js';
import {
  replaceFrontendAppPlaceholders,
  rewriteFrontendAppPackageJson,
} from './placeholders.js';
import { verifyFrontendApp } from './verify.js';

function deriveDefaultContextPath(projectName: string): string {
  const stripped = projectName.replace(/^g2rain-/, '').replace(/-app$/, '');
  return stripped || projectName;
}

export const frontendAppFamily: FamilyDefinition = {
  id: 'frontend-app',
  alias: 'app',
  label: '业务子应用 (frontend-app)',
  bundledTemplateDir: 'template',
  templateEnvVar: 'G2RAIN_TEMPLATE_PATH',
  templateRepository: 'https://github.com/g2rain/g2rain-app-template',
  defaultContextPath: deriveDefaultContextPath,
  helpText: `Usage: create-g2rain-app app <project-name> [options]
       create-g2rain-app --family frontend-app --name <project-name> [options]

Create a G2rain business micro-frontend sub-app (frontend-app) from g2rain-app-template.

Options:
  --context-path <path>   URL prefix without leading slash (default: derived from project name)
  --name <project-name>   Project directory / package name
  --help                  Show this help

Notes:
  - Uses @g2rain/platform/sub lifecycle direction.
  - generate / build-config tooling remains available inside the generated app.
  - Override template with G2RAIN_TEMPLATE_PATH for local development.
`,
  rewriteIdentity: rewriteFrontendAppIdentity,
  rewritePackageJson: rewriteFrontendAppPackageJson,
  replacePlaceholders: replaceFrontendAppPlaceholders,
  verify: verifyFrontendApp,
  nextSteps: (options) => [
    `cd ${options.projectName}`,
    'npm install',
    'npm run dev',
  ],
};
