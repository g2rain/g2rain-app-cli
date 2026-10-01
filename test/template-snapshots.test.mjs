import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'fs-extra';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { hashTemplateTree } = await import(
  pathToFileURL(path.join(repoRoot, 'scripts', 'template-tree-hash.mjs')).href
);
const {
  assertMetaValid,
  assertSourceHeadMatches,
  buildMetaV2,
  buildSnapshotMarkdown,
  isValidTemplateTag,
  normalizeMeta,
  resolveSourceCommit,
  TEMPLATE_TAG_PATTERN,
} = await import(
  pathToFileURL(path.join(repoRoot, 'scripts', 'lib', 'template-meta.mjs')).href
);
const { shouldCopyShell, includeInTreeHash } = await import(
  pathToFileURL(path.join(repoRoot, 'scripts', 'lib', 'template-sync-filter.mjs')).href
);
const { scaffoldProject } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href
);

test('template tag pattern accepts semver tags', () => {
  assert.equal(isValidTemplateTag('v0.2.0'), true);
  assert.equal(isValidTemplateTag('v0.2.0-rc.1'), true);
  assert.equal(isValidTemplateTag('v1.0.0-draft'), true);
  assert.equal(isValidTemplateTag('main'), false);
  assert.equal(isValidTemplateTag('0.2.0'), false);
  assert.ok(TEMPLATE_TAG_PATTERN.test('v0.1.0-cli-snapshot'));
});

test('normalizeMeta reads v1 and v2 shapes', () => {
  const v1 = normalizeMeta({
    repository: 'https://github.com/g2rain/g2rain-app-template',
    commit: 'ab71bcd1963d51c8136d73905c04ac9280463f10',
    syncedAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(v1.schemaVersion, 1);
  assert.equal(v1.sourceRepository, 'https://github.com/g2rain/g2rain-app-template');
  assert.equal(v1.sourceCommit, 'ab71bcd1963d51c8136d73905c04ac9280463f10');

  const v2 = normalizeMeta(
    buildMetaV2({
      family: 'frontend-app',
      kind: 'app-base',
      sourceRepository: 'https://github.com/g2rain/g2rain-app-template',
      sourceRef: 'v0.1.0',
      sourceCommit: 'ab71bcd1963d51c8136d73905c04ac9280463f10',
      contentSha256: `sha256:${'a'.repeat(64)}`,
    }),
  );
  assert.equal(v2.schemaVersion, 2);
  assert.equal(v2.managed, true);
  assert.equal(v2.sourceRef, 'v0.1.0');
});

test('assertMetaValid rejects unknown commit', () => {
  assert.throws(
    () =>
      assertMetaValid(
        {
          schemaVersion: 2,
          managed: true,
          family: 'frontend-app',
          kind: 'app-base',
          sourceRepository: 'https://github.com/g2rain/g2rain-app-template',
          sourceRef: 'v0.1.0',
          sourceCommit: 'unknown',
          contentSha256: `sha256:${'a'.repeat(64)}`,
        },
        {
          family: 'frontend-app',
          kind: 'app-base',
          sourceRepository: 'https://github.com/g2rain/g2rain-app-template',
        },
      ),
    /Invalid sourceCommit/,
  );
});

function git(cwd, args) {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'g2rain-test',
      GIT_AUTHOR_EMAIL: 'test@g2rain.local',
      GIT_COMMITTER_NAME: 'g2rain-test',
      GIT_COMMITTER_EMAIL: 'test@g2rain.local',
    },
  }).trim();
}

test('resolveSourceCommit requires refs/tags and does not accept a same-named branch', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'g2rain-tag-ref-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  git(dir, ['init']);
  git(dir, ['config', 'user.email', 'test@g2rain.local']);
  git(dir, ['config', 'user.name', 'g2rain-test']);
  await writeFile(path.join(dir, 'README.md'), 'one\n', 'utf8');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-m', 'first']);
  const first = git(dir, ['rev-parse', 'HEAD']);
  git(dir, ['tag', 'v0.1.0', first]);

  assert.equal(resolveSourceCommit(dir, 'v0.1.0'), first.toLowerCase());

  await writeFile(path.join(dir, 'README.md'), 'two\n', 'utf8');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-m', 'second']);
  git(dir, ['branch', 'v0.2.0']);

  assert.throws(() => resolveSourceCommit(dir, 'v0.2.0'), /must be a Git tag/);

  const second = git(dir, ['rev-parse', 'HEAD']);
  assert.throws(
    () => assertSourceHeadMatches(dir, first, 'v0.1.0'),
    /never checks out/,
  );
  assert.doesNotThrow(() => assertSourceHeadMatches(dir, second, 'HEAD'));
});

test('tree hash is deterministic and ignores markers', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'g2rain-hash-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'a.txt'), 'hello', 'utf8');
  await mkdir(path.join(dir, 'sub'), { recursive: true });
  await writeFile(path.join(dir, 'sub', 'b.txt'), 'world', 'utf8');
  await writeFile(
    path.join(dir, '.g2rain-template-meta.json'),
    JSON.stringify({ ignore: true }),
    'utf8',
  );
  await writeFile(path.join(dir, '.g2rain-template-snapshot.md'), '# ignore\n', 'utf8');

  const h1 = await hashTemplateTree(dir);
  const h2 = await hashTemplateTree(dir);
  assert.equal(h1, h2);
  assert.match(h1, /^sha256:[0-9a-f]{64}$/);

  await writeFile(path.join(dir, 'a.txt'), 'hello!', 'utf8');
  const h3 = await hashTemplateTree(dir);
  assert.notEqual(h1, h3);
});

test('tree hash is stable across LF and CRLF text checkouts', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'g2rain-hash-eol-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'README.md');

  await writeFile(file, 'line one\nline two\n', 'utf8');
  const lfHash = await hashTemplateTree(dir);

  await writeFile(file, 'line one\r\nline two\r\n', 'utf8');
  const crlfHash = await hashTemplateTree(dir);

  assert.equal(crlfHash, lfHash);
});

test('shell filter excludes legacy-overlay basename', () => {
  const root = path.join(os.tmpdir(), 'shell-src');
  assert.equal(
    shouldCopyShell(path.join(root, 'legacy-overlay'), root),
    false,
  );
  assert.equal(
    shouldCopyShell(path.join(root, 'legacy-overlay', 'x.ts'), root),
    false,
  );
  assert.equal(shouldCopyShell(path.join(root, 'src', 'main.ts'), root), true);
  assert.equal(includeInTreeHash('.g2rain-template-meta.json'), false);
  assert.equal(includeInTreeHash('lua/keys/iam-key-id.txt'), false);
});

test('snapshot markdown mentions legacy overlay rule', () => {
  const md = buildSnapshotMarkdown({
    sourceRepository: 'https://github.com/g2rain/g2rain-shell-template',
    sourceRef: 'v0.1.0',
    sourceCommit: 'a'.repeat(40),
    kind: 'shell-legacy-overlay',
  });
  assert.match(md, /do not edit/i);
  assert.match(md, /--with-legacy/);
  assert.match(md, /never be merged into the default Shell template/);
});

test('scaffold excludes snapshot markers from generated project', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-markers-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const template = path.join(sandbox, 'template');
  const generated = path.join(sandbox, 'out-app');
  await mkdir(path.join(template, 'docs', 'architecture'), { recursive: true });
  await mkdir(path.join(template, 'docs', 'decisions'), { recursive: true });
  await mkdir(path.join(template, 'src', 'platform', 'i18n'), { recursive: true });

  const commit = 'ab71bcd1963d51c8136d73905c04ac9280463f10';
  await writeFile(
    path.join(template, '.g2rain-template-meta.json'),
    JSON.stringify({
      schemaVersion: 2,
      managed: true,
      family: 'frontend-app',
      kind: 'app-base',
      sourceRepository: 'https://github.com/g2rain/g2rain-app-template',
      sourceRef: 'v0.1.0-draft',
      sourceCommit: commit,
      contentSha256: `sha256:${createHash('sha256').update('x').digest('hex')}`,
      syncedAt: new Date().toISOString(),
      syncWorkflow: '.github/workflows/sync-templates.yml',
    }),
    'utf8',
  );
  await writeFile(
    path.join(template, '.g2rain-template-snapshot.md'),
    '# Generated template snapshot — do not edit\n',
    'utf8',
  );

  const files = {
    'package.json': JSON.stringify({
      name: '{{PROJECT_NAME}}',
      repository: { type: 'git', url: 'git+https://github.com/g2rain/g2rain-app-template.git' },
      homepage: 'https://github.com/g2rain/g2rain-app-template#readme',
    }),
    'README.md': '# g2rain-app-template\n\ng2rain 官方 Vue 3 微前端子应用模板，提供基础能力。\n\n本仓库是“被生成的应用模板”，不是 CLI 本身。[g2rain-app-cli](https://github.com/g2rain/g2rain-app-cli) 负责生成。\n',
    'AGENTS.md': '# g2rain-app-template Agent Instructions\n\n- 类型：Vue 3 微前端应用模板\n\n本项目 docs 维护模板实现、生成器、部署细节和当前偏差。\n',
    'docs/index.md': '# g2rain-app-template 文档\n\n本目录用于基于当前源码维护模板。本目录维护模板实现、生成器、部署细节和偏差。修改模板将影响所有以后创建的应用。\n',
    'docs/architecture/overview.md': '# 架构概览\n\n本页描述 g2rain-app-template 的具体落地。\n\ng2rain-app-template 是生成后即可运行的 Vue 3 子应用模板。外部 CLI 负责复制和替换占位符；本仓库负责生成项目的运行架构、平台能力、业务页面约定、生成工具和部署基线。\n\n本仓库负责模板默认能力和生成后工程结构。\n',
    'docs/architecture/deviations.md': '# 偏差\n',
    'docs/decisions/README.md': '# 决策\n\n本目录记录只影响 g2rain-app-template 或前端模板演进的长期取舍。\n',
    'src/platform/i18n/README.md': '# g2rain-app-template 国际化用法\n',
    'docs/project.yaml':
      'schemaVersion: 1\nname: g2rain-app-template\nfamily: frontend-app-template\nrole: g2rain Vue 3 微前端子应用工程模板\npackageNameTemplate: "{{PROJECT_NAME}}"\nversion: 0.1.0\n\nprojectArchitecture:\n  role: frontend-app-template\n  note: 中央 Profile 管理跨 App 公共规则，本项目维护模板实现、生成工具、部署细节和当前偏差。\n\ntemplate:\n  placeholders:\n    - "{{PROJECT_NAME}}"\n  rules:\n    - 本仓库是应用模板\n\nlayers:\n  order:\n    - shared\n',
  };
  for (const [rel, content] of Object.entries(files)) {
    const fp = path.join(template, rel);
    await mkdir(path.dirname(fp), { recursive: true });
    await writeFile(fp, content, 'utf8');
  }

  await scaffoldProject(template, generated, {
    projectName: 'marker-app',
    contextPath: 'marker',
  });

  assert.equal(await fs.pathExists(path.join(generated, '.g2rain-template-meta.json')), false);
  assert.equal(
    await fs.pathExists(path.join(generated, '.g2rain-template-snapshot.md')),
    false,
  );

  const project = await readFile(path.join(generated, 'docs', 'project.yaml'), 'utf8');
  assert.match(project, /tag: "v0\.1\.0-draft"/);
  assert.match(project, new RegExp(`commit: "${commit}"`));
});
