import path from 'node:path';
import fs from 'fs-extra';
import { GENERATED_REPOSITORY_BASE } from '../../scaffold/types.js';
import { readCliVersion } from '../../shared/version.js';

export async function rewriteFrontendAppPackageJson(
  targetDir: string,
  projectName: string,
): Promise<void> {
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
  // 模板仓本地联调用 file:../g2rain-app-cli，生成项目改为当前 CLI 的 registry 版本
  if (pkg.devDependencies?.['create-g2rain-app']) {
    pkg.devDependencies['create-g2rain-app'] = `^${await readCliVersion()}`;
  }
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
}

export async function replaceFrontendAppPlaceholders(
  targetDir: string,
  vars: { projectName: string; contextPath: string },
): Promise<void> {
  const files = [
    'build.sh',
    'lua/config.lua',
    'README.md',
    '.env',
    '.env.production',
    'vite.config.ts',
    'src/runtime/env/index.ts',
    'docs/operations/configuration.md',
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
