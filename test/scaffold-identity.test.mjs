import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const realTemplate = path.join(repoRoot, 'template');
const { isDirectExecution, scaffoldProject } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href
);

test('generated project uses business app identity from the real template', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-app-cli-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const generated = path.join(sandbox, 'g2rain-member-app');

  await scaffoldProject(realTemplate, generated, {
    projectName: 'g2rain-member-app',
    contextPath: 'member',
  });

  const pkg = JSON.parse(await readFile(path.join(generated, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'g2rain-member-app');
  assert.match(pkg.description, /^g2rain-member-app - G2rain/);
  assert.equal(pkg.repository.url, 'git+https://github.com/g2rain/g2rain-member-app.git');

  const readme = await readFile(path.join(generated, 'README.md'), 'utf8');
  assert.match(readme, /^# g2rain-member-app$/m);
  assert.doesNotMatch(readme, /^# g2rain-app-template$/m);
  assert.doesNotMatch(readme, /官方 Vue 3 微前端子应用模板/);
  assert.doesNotMatch(readme, /\{\{PROJECT_NAME\}\}/);
  assert.doesNotMatch(readme, /\{\{CONTEXT_PATH\}\}/);

  const overview = await readFile(
    path.join(generated, 'docs', 'architecture', 'overview.md'),
    'utf8',
  );
  assert.doesNotMatch(overview, /是官方 Vue 3 微前端子应用工程模板/);
  assert.match(overview, /g2rain-member-app/);

  const project = await readFile(path.join(generated, 'docs', 'project.yaml'), 'utf8');
  assert.match(project, /^name: g2rain-member-app$/m);
  assert.match(project, /^family: frontend-app$/m);
  assert.match(project, /^packageName: g2rain-member-app$/m);
  assert.match(project, /contextPath: "member"/);
  assert.doesNotMatch(project, /^name: g2rain-app-template$/m);
  assert.doesNotMatch(project, /\{\{PROJECT_NAME\}\}/);
  assert.doesNotMatch(project, /\{\{CONTEXT_PATH\}\}/);

  const configuration = await readFile(
    path.join(generated, 'docs', 'operations', 'configuration.md'),
    'utf8',
  );
  assert.doesNotMatch(configuration, /\{\{PROJECT_NAME\}\}/);
  assert.doesNotMatch(configuration, /\{\{CONTEXT_PATH\}\}/);
  assert.match(configuration, /g2rain-member-app/);
  assert.match(configuration, /\/member/);

  const agents = await readFile(path.join(generated, 'AGENTS.md'), 'utf8');
  assert.match(agents, /^# g2rain-member-app Agent Instructions/m);
  assert.match(agents, /类型：Vue 3 微前端业务应用/);

  const deviations = await readFile(
    path.join(generated, 'docs', 'architecture', 'deviations.md'),
    'utf8',
  );
  assert.doesNotMatch(deviations, /DEV-008/);
});

test('linked npm bin path is recognized as direct execution', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-app-cli-link-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const { symlink } = await import('node:fs/promises');
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
