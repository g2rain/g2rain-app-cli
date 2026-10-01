import path from 'node:path';
import fs from 'fs-extra';
import { GENERATED_REPOSITORY_BASE } from '../../scaffold/types.js';

export async function rewriteFrontendShellPackageJson(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const pkgPath = path.join(targetDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) return;
  const pkg = await fs.readJson(pkgPath);
  const repositoryUrl = `${GENERATED_REPOSITORY_BASE}/${projectName}`;
  pkg.name = projectName;
  pkg.description = `${projectName} - G2rain Main Shell (Vue 3 + Vite + qiankun + Element Plus).`;
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

export async function replaceFrontendShellPlaceholders(
  targetDir: string,
  vars: { projectName: string; contextPath: string; port?: number },
): Promise<void> {
  const port = String(vars.port ?? 3000);
  const files = [
    'index.html',
    'README.md',
    'AGENTS.md',
    '.env',
    '.env.production',
    'vite.config.ts',
    'nginx/default.conf.example',
    'nginx/default.conf.template',
    'nginx/docker-entrypoint.sh',
    'docker-compose.sign.yml',
    'build.sh',
    'lua/config.lua',
    'src/shared/project.ts',
    'docs/index.md',
    'docs/architecture/overview.md',
    'docs/development/local-development.md',
    'docs/operations/configuration.md',
    'docs/operations/deployment.md',
  ];

  const replacements: Record<string, string> = {
    '{{PROJECT_NAME}}': vars.projectName,
    '{{CONTEXT_PATH}}': vars.contextPath,
    '{{DEV_SERVER_PORT}}': port,
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
