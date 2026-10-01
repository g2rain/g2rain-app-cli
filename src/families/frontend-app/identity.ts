import path from 'node:path';
import fs from 'fs-extra';
import { TEMPLATE_REPOSITORY, type GenerationIdentity } from '../../scaffold/types.js';

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

export async function rewriteFrontendAppIdentity(
  targetDir: string,
  identity: GenerationIdentity,
): Promise<void> {
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
        .replace('基于当前源码维护模板', '基于当前源码维护业务应用')
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
      const templateLines = [
        '  template:',
        `    repository: ${JSON.stringify(identity.templateRepository)}`,
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
