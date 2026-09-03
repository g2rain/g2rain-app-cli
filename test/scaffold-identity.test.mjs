import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { isDirectExecution, scaffoldProject } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href
);

test('generated project uses business app identity and keeps template provenance', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-app-cli-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const template = path.join(sandbox, 'template');
  const generated = path.join(sandbox, 'g2rain-member-app');
  await mkdir(path.join(template, 'docs', 'architecture'), { recursive: true });
  await mkdir(path.join(template, 'docs', 'decisions'), { recursive: true });

  const fixtureFiles = {
    '.idea/workspace.xml': '<project>g2rain-app-template feature/docs</project>',
    'package.json': JSON.stringify({
      name: '{{PROJECT_NAME}}',
      repository: { type: 'git', url: 'git+https://github.com/g2rain/g2rain-app-template.git' },
      homepage: 'https://github.com/g2rain/g2rain-app-template#readme',
    }),
    'README.md': '# g2rain-app-template\n\ng2rain 官方 Vue 3 微前端子应用模板，提供基础能力。\n\n本仓库是“被生成的应用模板”，不是 CLI 本身。[g2rain-app-cli](https://github.com/g2rain/g2rain-app-cli) 负责生成。\n',
    'AGENTS.md': '# g2rain-app-template Agent Instructions\n\n- 类型：Vue 3 微前端应用模板\n\n本项目 docs 维护模板实现、生成器、部署细节和当前偏差。\n',
    'docs/index.md': '# g2rain-app-template 文档\n\n本目录用于基于当前源码维护模板。本目录维护模板实现、生成器、部署细节和偏差。修改模板将影响所有以后创建的应用。\n',
    'docs/architecture/overview.md': '# 架构概览\n\n本页描述 g2rain-app-template 的具体落地。\n\ng2rain-app-template 是生成后即可运行的 Vue 3 子应用模板。外部 CLI 负责复制和替换占位符；本仓库负责生成项目的运行架构、平台能力、业务页面约定、生成工具和部署基线。\n\n本仓库负责模板默认能力和生成后工程结构。\n',
    'docs/architecture/deviations.md': '# 偏差\n\n## DEV-008：脚手架生成后文档身份未参数化\n\n待修复。\n',
    'docs/decisions/README.md': '# 决策\n\n本目录记录只影响 g2rain-app-template 或前端模板演进的长期取舍。\n',
    'src/platform/i18n/README.md': '# g2rain-app-template 国际化用法\n',
    'docs/project.yaml': 'schemaVersion: 1\nname: g2rain-app-template\nfamily: frontend-app-template\nrole: g2rain Vue 3 微前端子应用工程模板\npackageNameTemplate: "{{PROJECT_NAME}}"\nversion: 0.1.0\n\nprojectArchitecture:\n  role: frontend-app-template\n  note: 中央 Profile 管理跨 App 公共规则，本项目维护模板实现、生成工具、部署细节和当前偏差。\n\ntemplate:\n  placeholders:\n    - "{{PROJECT_NAME}}"\n  rules:\n    - 本仓库是应用模板\n\nlayers:\n  order:\n    - shared\n',
  };

  for (const [relativePath, content] of Object.entries(fixtureFiles)) {
    const filePath = path.join(template, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }

  await scaffoldProject(template, generated, {
    projectName: 'g2rain-member-app',
    contextPath: 'member',
  });
  const pkg = JSON.parse(await readFile(path.join(generated, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'g2rain-member-app');
  assert.match(pkg.description, /^g2rain-member-app - G2rain/);
  assert.equal(pkg.repository.url, 'git+https://github.com/g2rain/g2rain-member-app.git');
  assert.equal(pkg.homepage, 'https://github.com/g2rain/g2rain-member-app#readme');

  const agents = await readFile(path.join(generated, 'AGENTS.md'), 'utf8');
  assert.match(agents, /^# g2rain-member-app Agent Instructions/m);
  assert.match(agents, /类型：Vue 3 微前端业务应用/);

  const project = await readFile(path.join(generated, 'docs', 'project.yaml'), 'utf8');
  assert.match(project, /^name: g2rain-member-app$/m);
  assert.match(project, /^family: frontend-app$/m);
  assert.match(project, /^packageName: g2rain-member-app$/m);
  assert.match(project, /repository: "https:\/\/github.com\/g2rain\/g2rain-app-template"/);
  assert.match(project, /ref: "local"/);
  assert.match(project, /contextPath: "member"/);
  assert.doesNotMatch(project, /本仓库是应用模板/);

  const deviations = await readFile(path.join(generated, 'docs', 'architecture', 'deviations.md'), 'utf8');
  assert.doesNotMatch(deviations, /DEV-008/);
  const i18nReadme = await readFile(
    path.join(generated, 'src', 'platform', 'i18n', 'README.md'),
    'utf8',
  );
  assert.match(i18nReadme, /^# g2rain-member-app 国际化用法$/m);
  await assert.rejects(
    readFile(path.join(generated, '.idea', 'workspace.xml'), 'utf8'),
    { code: 'ENOENT' },
  );
});

test('linked npm bin path is recognized as direct execution', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-app-cli-link-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const linkedRepo = path.join(sandbox, 'create-g2rain-app');
  await symlink(repoRoot, linkedRepo, 'junction');

  assert.equal(
    isDirectExecution(
      path.join(linkedRepo, 'dist', 'index.js'),
      path.join(repoRoot, 'dist', 'index.js'),
    ),
    true,
  );
});
