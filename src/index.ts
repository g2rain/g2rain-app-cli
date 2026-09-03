#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import prompts from 'prompts';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CliArgs {
  projectName?: string;
  contextPath?: string;
}

interface TemplateVars {
  projectName: string;
  contextPath: string;
}

interface GenerationIdentity extends TemplateVars {
  cliVersion: string;
  templateRepository: string;
  templateRef: string;
}

const TEMPLATE_REPOSITORY = 'https://github.com/g2rain/g2rain-app-template';
const GENERATED_REPOSITORY_BASE = 'https://github.com/g2rain';

const filterCopy = (src: string) => {
  const basename = path.basename(src);
  const blocked = [
    'node_modules',
    'dist',
    '.git',
    '.idea',
    '.DS_Store',
    'package-lock.json',
  ];
  if (blocked.includes(basename)) return false;
  return true;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  const rest = argv.slice(2);

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--context-path' || arg === '--context_path') {
      args.contextPath = rest[++i];
    } else if (arg.startsWith('-')) {
      continue;
    } else if (!args.projectName) {
      args.projectName = arg;
    } else if (!args.contextPath) {
      args.contextPath = arg;
    }
  }

  return args;
}

function deriveDefaultContextPath(projectName: string): string {
  const stripped = projectName.replace(/^g2rain-/, '').replace(/-app$/, '');
  return stripped || projectName;
}

function normalizeContextPath(input: string): string {
  const normalized = input.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    throw new Error('Context path cannot be empty');
  }
  return normalized;
}

async function ensureProjectName(initial?: string) {
  if (initial) return initial;
  const { name } = await prompts({
    type: 'text',
    name: 'name',
    message: 'Project name',
    initial: 'g2rain-new-app',
  });
  return name;
}

async function ensureContextPath(projectName: string, initial?: string) {
  if (initial) return normalizeContextPath(initial);

  const { contextPath } = await prompts({
    type: 'text',
    name: 'contextPath',
    message: 'Context path (URL prefix, without leading slash)',
    initial: deriveDefaultContextPath(projectName),
  });

  if (!contextPath) {
    throw new Error('Context path is required');
  }

  return normalizeContextPath(contextPath);
}

async function copyTemplate(templateRoot: string, targetDir: string) {
  await fs.copy(templateRoot, targetDir, { filter: filterCopy });
}

async function rewritePackageJson(targetDir: string, projectName: string) {
  const pkgPath = path.join(targetDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) return;
  const pkg = await fs.readJson(pkgPath);
  const repositoryUrl = `${GENERATED_REPOSITORY_BASE}/${projectName}`;
  pkg.name = projectName;
  pkg.description = `${projectName} - G2rain Vue 3 micro-frontend sub-app (Vite + qiankun + Element Plus).`;
  pkg.repository = {
    type: 'git',
    url: `git+${repositoryUrl}.git`,
  };
  pkg.homepage = `${repositoryUrl}#readme`;
  if (Array.isArray(pkg.keywords)) {
    pkg.keywords = pkg.keywords.filter((keyword: unknown) => keyword !== 'template');
  }
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
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

function normalizeGitRepository(repository?: string): string {
  if (!repository) return TEMPLATE_REPOSITORY;
  return repository
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '');
}

async function resolveGenerationIdentity(
  templateRoot: string,
  vars: TemplateVars,
): Promise<GenerationIdentity> {
  const cliPackage = await fs.readJson(path.resolve(__dirname, '..', 'package.json'));
  const git = await readGitMetadata(templateRoot);
  return {
    ...vars,
    cliVersion: String(cliPackage.version),
    templateRepository: normalizeGitRepository(git.repository),
    templateRef: git.ref || 'local',
  };
}

async function rewriteTextFile(
  targetDir: string,
  relativePath: string,
  rewrite: (content: string) => string,
) {
  const filePath = path.join(targetDir, relativePath);
  if (!(await fs.pathExists(filePath))) return;
  const content = await fs.readFile(filePath, 'utf-8');
  const rewritten = rewrite(content);
  if (rewritten !== content) {
    await fs.writeFile(filePath, rewritten, 'utf-8');
  }
}

async function rewriteGeneratedProjectIdentity(
  targetDir: string,
  identity: GenerationIdentity,
) {
  const { projectName } = identity;

  await Promise.all([
    rewriteTextFile(targetDir, 'README.md', (content) =>
      content
        .replace(/^# g2rain-app-template$/m, `# ${projectName}`)
        .replace(
          'g2rain 官方 Vue 3 微前端子应用模板，提供',
          `${projectName} 是 g2rain Vue 3 微前端子应用，提供`,
        )
        .replace(
          /本仓库是“被生成的应用模板”，不是 CLI 本身。[^\r\n]*/,
          `本项目由 [g2rain-app-cli](https://github.com/g2rain/g2rain-app-cli) 基于 [g2rain-app-template](${TEMPLATE_REPOSITORY}) 生成。`,
        ),
    ),
    rewriteTextFile(targetDir, 'AGENTS.md', (content) =>
      content
        .replace(/^# g2rain-app-template Agent Instructions$/m, `# ${projectName} Agent Instructions`)
        .replace('类型：Vue 3 微前端应用模板', '类型：Vue 3 微前端业务应用')
        .replace(
          '本项目 docs 维护模板实现、生成器、部署细节和当前偏差。',
          '本项目 docs 维护业务实现、生成器、部署细节和当前偏差。',
        ),
    ),
    rewriteTextFile(targetDir, 'docs/index.md', (content) =>
      content
        .replace(/^# g2rain-app-template 文档$/m, `# ${projectName} 文档`)
        .replace(
          '基于当前源码维护模板',
          '基于当前源码维护业务应用',
        )
        .replace(
          '本目录维护模板实现、生成器、部署细节和',
          '本目录维护当前业务应用的实现、生成器、部署细节和',
        )
        .replace(
          '修改模板将影响所有以后创建的应用',
          '修改公共工程能力时应评估与官方模板及其他业务应用的兼容性',
        ),
    ),
    rewriteTextFile(targetDir, 'docs/architecture/overview.md', (content) =>
      content
        .replace('本页描述 g2rain-app-template 的具体落地。', `本页描述 ${projectName} 的具体落地。`)
        .replace(
          'g2rain-app-template 是生成后即可运行的 Vue 3 子应用模板。外部 CLI 负责复制和替换占位符；本仓库负责生成项目的运行架构、平台能力、业务页面约定、生成工具和部署基线。',
          `${projectName} 是由 [g2rain-app-template](${TEMPLATE_REPOSITORY}) 生成的 Vue 3 子应用。本仓库负责当前业务应用的运行架构、平台能力、业务页面、生成工具和部署配置。`,
        )
        .replace(
          '本仓库负责模板默认能力和生成后工程结构',
          '本仓库负责当前业务应用能力和工程结构',
        ),
    ),
    rewriteTextFile(targetDir, 'docs/decisions/README.md', (content) =>
      content.replace(
        '本目录记录只影响 g2rain-app-template 或前端模板演进的长期取舍',
        `本目录记录只影响 ${projectName} 的长期取舍`,
      ),
    ),
    rewriteTextFile(targetDir, 'src/platform/i18n/README.md', (content) =>
      content.replace(
        /^# g2rain-app-template 国际化用法$/m,
        `# ${projectName} 国际化用法`,
      ),
    ),
    rewriteTextFile(targetDir, 'docs/architecture/deviations.md', (content) =>
      content.replace(/\r?\n## DEV-008：脚手架生成后文档身份未参数化[\s\S]*$/, ''),
    ),
    rewriteTextFile(targetDir, 'docs/project.yaml', (content) => {
      const generation = [
        'generation:',
        '  cli:',
        '    name: create-g2rain-app',
        `    version: ${JSON.stringify(identity.cliVersion)}`,
        '  template:',
        `    repository: ${JSON.stringify(identity.templateRepository)}`,
        `    ref: ${JSON.stringify(identity.templateRef)}`,
        `  contextPath: ${JSON.stringify(identity.contextPath)}`,
        '',
        '',
      ].join('\n');

      return content
        .replace(/^name: g2rain-app-template$/m, `name: ${projectName}`)
        .replace(/^family: frontend-app-template$/m, 'family: frontend-app')
        .replace(/^role: g2rain Vue 3 微前端子应用工程模板$/m, 'role: g2rain Vue 3 微前端业务应用')
        .replace(/^packageNameTemplate: "\{\{PROJECT_NAME\}\}"$/m, `packageName: ${projectName}`)
        .replace(/^  role: frontend-app-template$/m, '  role: frontend-app')
        .replace(
          /^  note: 中央 Profile 管理跨 App 公共规则，本项目维护模板实现、生成工具、部署细节和当前偏差。$/m,
          '  note: 中央 Profile 管理跨 App 公共规则，本项目维护业务实现、生成工具、部署细节和当前偏差。',
        )
        .replace(/\r?\ntemplate:\r?\n[\s\S]*?(?=layers:)/, `\n${generation}`);
    }),
  ]);
}

export async function scaffoldProject(
  templateRoot: string,
  targetDir: string,
  vars: TemplateVars,
) {
  await copyTemplate(templateRoot, targetDir);
  await rewritePackageJson(targetDir, vars.projectName);
  await replaceTemplatePlaceholders(targetDir, vars);
  const generationIdentity = await resolveGenerationIdentity(templateRoot, vars);
  await rewriteGeneratedProjectIdentity(targetDir, generationIdentity);
}

export function isDirectExecution(
  entryPath = process.argv[1],
  modulePath = fileURLToPath(import.meta.url),
): boolean {
  if (!entryPath) return false;
  try {
    return fs.realpathSync(entryPath) === fs.realpathSync(modulePath);
  } catch {
    return path.resolve(entryPath) === path.resolve(modulePath);
  }
}

async function replaceTemplatePlaceholders(targetDir: string, vars: TemplateVars) {
  const files = [
    'build.sh',
    'lua/config.lua',
    'README.md',
    '.env',
    '.env.production',
    'vite.config.ts',
    'src/runtime/env/index.ts',
  ];

  const replacements: Record<string, string> = {
    '{{PROJECT_NAME}}': vars.projectName,
    '{{CONTEXT_PATH}}': vars.contextPath,
  };

  await Promise.all(
    files.map(async (relativePath) => {
      const filePath = path.join(targetDir, relativePath);
      if (!(await fs.pathExists(filePath))) return;

      let content = await fs.readFile(filePath, 'utf-8');
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.split(placeholder).join(value);
      }
      await fs.writeFile(filePath, content, 'utf-8');
    }),
  );
}

async function cloneTemplateFromGitHub(templateRoot: string): Promise<void> {
  const templateRepo = TEMPLATE_REPOSITORY;
  const templateDir = path.dirname(templateRoot);

  console.log(kleur.cyan(`➜ Cloning template from ${templateRepo}...`));

  try {
    await fs.ensureDir(templateDir);

    execFileSync('git', ['clone', templateRepo, templateRoot], {
      stdio: 'inherit',
      cwd: templateDir,
    });

    console.log(kleur.green('✔ Template cloned successfully'));
  } catch (error: any) {
    console.error(kleur.red('✖ Failed to clone template from GitHub'));
    if (error.message) {
      console.error(kleur.red(error.message));
    }
    throw error;
  }
}

async function main() {
  const cliArgs = parseArgs(process.argv);
  let projectName: string | undefined;
  let contextPath: string;

  try {
    projectName = await ensureProjectName(cliArgs.projectName);
    if (!projectName) {
      console.error(kleur.red('✖ Project name is required'));
      process.exit(1);
    }
    contextPath = await ensureContextPath(projectName, cliArgs.contextPath);
  } catch (error: any) {
    console.error(kleur.red(`✖ ${error.message || 'Invalid arguments'}`));
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(targetDir)) {
    console.error(kleur.red(`✖ Target directory already exists: ${targetDir}`));
    process.exit(1);
  }

  const templateRoot =
    process.env.G2RAIN_TEMPLATE_PATH ||
    path.resolve(__dirname, '..', '..', 'g2rain-app-template');

  if (!(await fs.pathExists(templateRoot))) {
    console.log(
      kleur.yellow(
        `⚠ Template not found at ${templateRoot}. Attempting to clone from GitHub...`,
      ),
    );

    try {
      await cloneTemplateFromGitHub(templateRoot);
    } catch (error) {
      console.error(
        kleur.red(
          `✖ Failed to clone template. Please ensure git is installed and the repository is accessible.`,
        ),
      );
      console.error(
        kleur.red(
          `You can also set G2RAIN_TEMPLATE_PATH to use a local template directory.`,
        ),
      );
      process.exit(1);
    }
  }

  console.log(kleur.cyan(`➜ Using template: ${templateRoot}`));
  await scaffoldProject(templateRoot, targetDir, {
    projectName,
    contextPath,
  });

  console.log(kleur.green(`\n✔ Project created at ${targetDir}`));
  console.log(kleur.cyan(`  context path: /${contextPath}`));
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run dev');
  console.log('\nTip: set G2RAIN_TEMPLATE_PATH to use a remote/template directory when publishing.');
}

if (isDirectExecution()) {
  main().catch((err) => {
    console.error(kleur.red('✖ Failed to create project'));
    console.error(err);
    process.exit(1);
  });
}
