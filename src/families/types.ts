export type FamilyId = 'frontend-app' | 'frontend-shell';

export type FamilyAlias = 'app' | 'shell';

export interface CreateOptions {
  family: FamilyId;
  /** True when user passed `app`/`shell` or `--family`. */
  familyExplicit: boolean;
  projectName: string;
  contextPath: string;
  port?: number;
  /** Shell-only: merge template-shell-legacy overlay. */
  withLegacy?: boolean;
}

export interface FamilyDefinition {
  id: FamilyId;
  alias: FamilyAlias;
  label: string;
  bundledTemplateDir: string;
  templateEnvVar: string;
  templateRepository: string;
  defaultContextPath: (projectName: string) => string;
  defaultPort?: number;
  helpText: string;
  rewriteIdentity: (targetDir: string, identity: import('../scaffold/types.js').GenerationIdentity) => Promise<void>;
  rewritePackageJson: (targetDir: string, projectName: string) => Promise<void>;
  replacePlaceholders: (
    targetDir: string,
    vars: { projectName: string; contextPath: string; port?: number },
  ) => Promise<void>;
  verify: (targetDir: string) => Promise<void>;
  nextSteps: (options: CreateOptions) => string[];
}

export const FAMILY_ALIASES: Record<FamilyAlias, FamilyId> = {
  app: 'frontend-app',
  shell: 'frontend-shell',
};

export function isFamilyAlias(value: string): value is FamilyAlias {
  return value === 'app' || value === 'shell';
}

export function isFamilyId(value: string): value is FamilyId {
  return value === 'frontend-app' || value === 'frontend-shell';
}
