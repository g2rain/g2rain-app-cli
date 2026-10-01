import path from 'node:path';
import fs from 'fs-extra';
import type { GenerationIdentity } from '../../scaffold/types.js';

const SHELL_TEMPLATE_REPOSITORY = 'https://github.com/g2rain/g2rain-shell-template';

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

export async function rewriteFrontendShellIdentity(
  targetDir: string,
  identity: GenerationIdentity,
): Promise<void> {
  const { projectName, contextPath } = identity;
  const port = identity.port ?? 3000;
  const templateRepo = identity.templateRepository || SHELL_TEMPLATE_REPOSITORY;
  const withLegacy = Boolean(identity.withLegacy);

  await Promise.all([
    rewriteTextFile(targetDir, 'README.md', (content) => {
      let next = content
        .replace(/^# g2rain-shell-template$/m, `# ${projectName}`)
        .replace(
          /本仓库是「被生成的主应用模板」源仓，不是 CLI 本身。\[g2rain-app-cli\]\(https:\/\/github\.com\/g2rain\/g2rain-app-cli\) 的 `create-g2rain-app shell` 将复制本仓并替换占位符后产出可运行主应用。/,
          `本项目由 [g2rain-app-cli](https://github.com/g2rain/g2rain-app-cli) 基于 [g2rain-shell-template](${templateRepo}) 生成。`,
        );
      if (withLegacy && !/legacyCompatibility|`--with-legacy`/.test(next)) {
        next = `${next.trimEnd()}\n\n## Legacy compatibility (temporary)\n\nThis Shell was created with \`--with-legacy\`. Stock apps listed in \`src/platform/legacy/registry.ts\` still use Token-in-props. After migration, empty the registry, delete \`src/platform/legacy/\` and \`legacy-message-bridge.ts\`, restore the default no-op \`src/runtime/shell-extensions.ts\`, set \`legacyCompatibility: false\` in \`docs/project.yaml\`, then run the default AppKit acceptance.\n`;
      }
      return next;
    }),
    rewriteTextFile(targetDir, 'AGENTS.md', (content) =>
      content
        .replace(/^# AGENTS\.md$/m, `# ${projectName} Agent Instructions`)
        .replace(
          '本仓库是 **Main Shell 官方模板**（`family: frontend-shell-template`）',
          `本仓库是 **Main Shell 业务主应用**（\`family: frontend-shell\`）`,
        )
        .replace(
          /由 `create-g2rain-app shell` 复制并替换 `[^`]+`、`[^`]+`、`[^`]+` 等占位符后生成可运行主应用。/,
          `由 [g2rain-app-cli](https://github.com/g2rain/g2rain-app-cli) 基于 [g2rain-shell-template](${templateRepo}) 生成。`,
        )
        .replace(
          '至少执行 `npm run build`（模板仓验证前先将 `.env` 中 Context Path / 端口占位符替换为具体值，例如 `/admin` / `3000`）。',
          '至少执行 `npm run build`（生成项目 `.env` 应由脚手架写入具体 Context Path / 端口）。',
        ),
    ),
    rewriteTextFile(targetDir, 'docs/index.md', (content) =>
      content
        .replace(/g2rain-shell-template/g, projectName)
        .replace(/frontend-shell-template/g, 'frontend-shell')
        .replace(
          /本目录记录 Main Shell 官方模板（`frontend-shell`）的项目事实，对齐中央 `frontend-app 1\.0\.0` 与 `frontend-shell 1\.0\.0`，并补充模板占位符与脚手架约定。/,
          `本目录记录 Main Shell 主应用（\`${projectName}\`）的项目事实，对齐中央 \`frontend-app 1.0.0\` 与 \`frontend-shell 1.0.0\`。`,
        ),
    ),
    rewriteTextFile(targetDir, 'docs/architecture/overview.md', (content) =>
      content
        .replace(/g2rain-shell-template/g, projectName)
        .replace(/frontend-shell-template/g, 'frontend-shell'),
    ),
    rewriteTextFile(targetDir, 'docs/project.yaml', (content) => {
      const templateLines = [
        '  template:',
        `    repository: ${JSON.stringify(templateRepo)}`,
      ];
      if (identity.templateTag) {
        templateLines.push(`    tag: ${JSON.stringify(identity.templateTag)}`);
      }
      if (identity.templateCommit) {
        templateLines.push(`    commit: ${JSON.stringify(identity.templateCommit)}`);
      }
      templateLines.push(`    ref: ${JSON.stringify(identity.templateRef)}`);

      const generation = [
        'generation:',
        '  cli:',
        '    name: create-g2rain-app',
        `    version: ${JSON.stringify(identity.cliVersion)}`,
        ...templateLines,
        `  contextPath: ${JSON.stringify(contextPath)}`,
        `  devServerPort: ${port}`,
        `  legacyCompatibility: ${withLegacy}`,
        '',
        '',
      ].join('\n');

      let next = content
        .replace(/^name:\s*"?\{\{PROJECT_NAME\}\}"?$/m, `name: ${projectName}`)
        .replace(/^name:\s*"?g2rain-shell-template"?$/m, `name: ${projectName}`)
        .replace(/^family:\s*frontend-shell-template$/m, 'family: frontend-shell')
        .replace(
          /^role:\s*.*$/m,
          'role: G2rain Main Shell 主应用（由 create-g2rain-app shell 生成）',
        )
        .replace(
          /^  applicationCode:\s*"?\{\{PROJECT_NAME\}\}"?$/m,
          `  applicationCode: ${projectName}`,
        )
        .replace(
          /^  contextPath:\s*"?\/\{\{CONTEXT_PATH\}\}"?$/m,
          `  contextPath: /${contextPath}`,
        )
        .replace(
          /^  devServerPort:\s*"?\{\{DEV_SERVER_PORT\}\}"?$/m,
          `  devServerPort: ${port}`,
        )
        .replace(/^repository:\s*.*$/m, `repository: g2rain/${projectName}`)
        .replace(/^(\s+)status:\s*template$/m, '$1status: generated');

      if (/^placeholders:\r?\n/m.test(next)) {
        next = next.replace(/\r?\nplaceholders:\r?\n(?:[ \t]+-.*\r?\n)*/, '\n');
      }
      if (/^generation:\r?\n/m.test(next)) {
        next = next.replace(/\r?\ngeneration:\r?\n[\s\S]*?(?=\n[a-zA-Z]|\n*$)/, `\n${generation}`);
      } else if (/^commands:\r?\n/m.test(next)) {
        next = next.replace(/^commands:\r?\n/m, `${generation}commands:\n`);
      } else {
        next = `${next.trimEnd()}\n\n${generation}`;
      }
      return next;
    }),
  ]);

  if (withLegacy) {
    await appendLegacyDeviations(targetDir);
    await ensureLegacyTestScript(targetDir);
  }
}

async function appendLegacyDeviations(targetDir: string): Promise<void> {
  const fragmentPath = path.join(
    targetDir,
    'docs/architecture/legacy-deviations.fragment.md',
  );
  const deviationsPath = path.join(targetDir, 'docs/architecture/deviations.md');
  if (!(await fs.pathExists(fragmentPath)) || !(await fs.pathExists(deviationsPath))) {
    return;
  }
  const fragment = await fs.readFile(fragmentPath, 'utf-8');
  const rows = fragment
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| TPL-LEGACY-'));
  if (rows.length === 0) return;

  let deviations = await fs.readFile(deviationsPath, 'utf-8');
  if (deviations.includes('TPL-LEGACY-010')) return;

  const trimmed = deviations.trimEnd();
  deviations = `${trimmed}\n${rows.join('\n')}\n`;
  await fs.writeFile(deviationsPath, deviations, 'utf-8');
}

async function ensureLegacyTestScript(targetDir: string): Promise<void> {
  const pkgPath = path.join(targetDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) return;
  const pkg = await fs.readJson(pkgPath);
  pkg.scripts = pkg.scripts ?? {};
  pkg.scripts['test:legacy'] =
    'node --experimental-strip-types --test src/platform/legacy/adapter.test.ts';
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
}
