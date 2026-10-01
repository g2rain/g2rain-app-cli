import type { FamilyId } from '../families/types.js';

export interface TemplateVars {
  projectName: string;
  contextPath: string;
  family?: FamilyId;
  port?: number;
  /** Shell-only: merge template-shell-legacy overlay. */
  withLegacy?: boolean;
}

export interface GenerationIdentity extends TemplateVars {
  cliVersion: string;
  templateRepository: string;
  /** @deprecated Prefer templateTag + templateCommit; kept as commit or tag for older consumers. */
  templateRef: string;
  /** Source template Git tag when synced from a managed snapshot. */
  templateTag?: string;
  /** Full 40-char source commit SHA when known. */
  templateCommit?: string;
}

export const TEMPLATE_REPOSITORY = 'https://github.com/g2rain/g2rain-app-template';
export const SHELL_TEMPLATE_REPOSITORY = 'https://github.com/g2rain/g2rain-shell-template';
export const GENERATED_REPOSITORY_BASE = 'https://github.com/g2rain';
