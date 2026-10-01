import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import {
  TEMPLATE_REPOSITORY,
  type GenerationIdentity,
  type TemplateVars,
} from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface EmbeddedTemplateMeta {
  schemaVersion?: number;
  repository?: string;
  commit?: string;
  sourceRepository?: string;
  sourceRef?: string;
  sourceCommit?: string;
}

async function resolveGitDirectory(templateRoot: string): Promise<string | undefined> {
  const dotGit = path.join(templateRoot, '.git');
  if (!(await fs.pathExists(dotGit))) return undefined;
  const stat = await fs.stat(dotGit);
  if (stat.isDirectory()) return dotGit;

  const pointer = await fs.readFile(dotGit, 'utf-8');
  const match = pointer.match(/^gitdir:\s*(.+)$/m);
  return match ? path.resolve(templateRoot, match[1].trim()) : undefined;
}

async function readGitMetadata(templateRoot: string): Promise<{
  repository?: string;
  ref?: string;
}> {
  try {
    const gitDir = await resolveGitDirectory(templateRoot);
    if (!gitDir) return {};
    const commonDirFile = path.join(gitDir, 'commondir');
    const commonDir = (await fs.pathExists(commonDirFile))
      ? path.resolve(gitDir, (await fs.readFile(commonDirFile, 'utf-8')).trim())
      : gitDir;
    const config = await fs.readFile(path.join(commonDir, 'config'), 'utf-8');
    const originSection = config.match(
      /\[remote\s+"origin"\]([\s\S]*?)(?=\r?\n\[|$)/,
    )?.[1];
    const repository = originSection?.match(/^\s*url\s*=\s*(.+)$/m)?.[1].trim();

    const head = (await fs.readFile(path.join(gitDir, 'HEAD'), 'utf-8')).trim();
    if (!head.startsWith('ref: ')) return { repository, ref: head };
    const refName = head.slice(5).trim();
    for (const baseDir of [gitDir, commonDir]) {
      const looseRef = path.join(baseDir, ...refName.split('/'));
      if (await fs.pathExists(looseRef)) {
        return {
          repository,
          ref: (await fs.readFile(looseRef, 'utf-8')).trim(),
        };
      }
    }
    const packedRefs = path.join(commonDir, 'packed-refs');
    if (await fs.pathExists(packedRefs)) {
      const match = (await fs.readFile(packedRefs, 'utf-8'))
        .split(/\r?\n/)
        .find((line) => line.endsWith(` ${refName}`));
      if (match) return { repository, ref: match.split(' ')[0] };
    }
    return { repository };
  } catch {
    return {};
  }
}

async function readEmbeddedMeta(
  templateRoot: string,
): Promise<EmbeddedTemplateMeta | undefined> {
  const metaPath = path.join(templateRoot, '.g2rain-template-meta.json');
  if (!(await fs.pathExists(metaPath))) return undefined;
  try {
    return (await fs.readJson(metaPath)) as EmbeddedTemplateMeta;
  } catch {
    return undefined;
  }
}

function normalizeGitRepository(repository?: string, fallback = TEMPLATE_REPOSITORY): string {
  if (!repository) return fallback;
  return repository
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '');
}

function isFullCommit(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{40}$/i.test(value) && value !== 'unknown');
}

export async function resolveGenerationIdentity(
  templateRoot: string,
  vars: TemplateVars,
  defaultRepository: string = TEMPLATE_REPOSITORY,
): Promise<GenerationIdentity> {
  const cliPackage = await fs.readJson(path.resolve(__dirname, '..', '..', 'package.json'));
  const embedded = await readEmbeddedMeta(templateRoot);
  if (embedded) {
    const sourceRepository = normalizeGitRepository(
      embedded.sourceRepository || embedded.repository,
      defaultRepository,
    );
    const sourceCommit = embedded.sourceCommit || embedded.commit;
    const sourceRef = embedded.sourceRef;

    if (sourceCommit === 'unknown') {
      throw new Error(
        `Embedded template meta has commit "unknown" at ${templateRoot}. Re-run the sync-templates workflow.`,
      );
    }

    const templateCommit = isFullCommit(sourceCommit) ? sourceCommit.toLowerCase() : undefined;
    const templateTag = sourceRef || undefined;
    const templateRef = templateCommit || templateTag || 'embedded';

    return {
      ...vars,
      cliVersion: String(cliPackage.version),
      templateRepository: sourceRepository,
      templateRef,
      templateTag,
      templateCommit,
    };
  }

  const git = await readGitMetadata(templateRoot);
  return {
    ...vars,
    cliVersion: String(cliPackage.version),
    templateRepository: normalizeGitRepository(git.repository, defaultRepository),
    templateRef: git.ref || 'local',
    templateCommit: isFullCommit(git.ref) ? git.ref.toLowerCase() : undefined,
  };
}
