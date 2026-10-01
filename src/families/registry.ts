import { frontendAppFamily } from './frontend-app/definition.js';
import { frontendShellFamily } from './frontend-shell/definition.js';
import type { FamilyDefinition, FamilyId } from './types.js';

const families = new Map<FamilyId, FamilyDefinition>([
  [frontendAppFamily.id, frontendAppFamily],
  [frontendShellFamily.id, frontendShellFamily],
]);

export function getFamily(id: FamilyId): FamilyDefinition {
  const family = families.get(id);
  if (!family) {
    throw new Error(`Unknown project family: ${id}`);
  }
  return family;
}

export function listFamilies(): FamilyDefinition[] {
  return [...families.values()];
}

export function printRootHelp(): string {
  return `Usage: create-g2rain-app <command> [options]

Commands:
  app <name>      Create a business sub-app (frontend-app)
  shell <name>    Create a Main Shell (frontend-shell)
  create [name]   Legacy alias; defaults to frontend-app
  generate        Generate views/api from SQL (frontend-app projects)
  build-config    Build static resource config (frontend-app projects)

Family flags:
  --family frontend-app|frontend-shell
  --name <project-name>

Help:
  create-g2rain-app --help
  create-g2rain-app app --help
  create-g2rain-app shell --help

Default: when family is omitted, create-g2rain-app generates frontend-app.
`;
}
