import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'fs-extra';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliEntry = path.join(repoRoot, 'dist', 'index.js');

const { parseTopLevel, parseCreateArgs } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'cli', 'parse.js')).href
);
const { scaffoldProject } = await import(pathToFileURL(cliEntry).href);
const { runCreate, runHelp } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'commands', 'create.js')).href
);
const { resolveTemplateRoot } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'scaffold', 'resolve-template-root.js')).href
);

async function captureConsole(run) {
  const originalLog = console.log;
  const output = [];
  console.log = (...args) => output.push(args.join(' '));
  try {
    await run();
    return output.join('\n');
  } finally {
    console.log = originalLog;
  }
}

test('app alias and --family frontend-app parse to frontend-app', () => {
  const aliased = parseTopLevel(['node', 'create-g2rain-app', 'app', 'demo-app']);
  assert.equal(aliased.command, 'create');
  assert.equal(aliased.familyAlias, 'app');
  const parsed = parseCreateArgs(aliased.args, aliased.familyAlias);
  assert.equal(parsed.family, 'frontend-app');
  assert.equal(parsed.familyExplicit, true);
  assert.equal(parsed.projectName, 'demo-app');

  const flagged = parseCreateArgs(['--family', 'frontend-app', '--name', 'demo-app']);
  assert.equal(flagged.family, 'frontend-app');
  assert.equal(flagged.projectName, 'demo-app');
  assert.equal(flagged.familyExplicit, true);
});

test('shell alias and --family frontend-shell parse with defaults', () => {
  const aliased = parseTopLevel(['node', 'create-g2rain-app', 'shell', 'demo-shell', '--port', '3100']);
  assert.equal(aliased.familyAlias, 'shell');
  const parsed = parseCreateArgs(aliased.args, aliased.familyAlias);
  assert.equal(parsed.family, 'frontend-shell');
  assert.equal(parsed.projectName, 'demo-shell');
  assert.equal(parsed.port, 3100);
  assert.equal(parsed.withLegacy, false);

  const flagged = parseCreateArgs([
    '--family',
    'frontend-shell',
    '--name',
    'demo-shell',
    '--context-path',
    'admin',
  ]);
  assert.equal(flagged.family, 'frontend-shell');
  assert.equal(flagged.contextPath, 'admin');
});

test('shell --with-legacy parses; app rejects --with-legacy', () => {
  const shell = parseCreateArgs(
    ['demo-shell', '--with-legacy', '--context-path', 'admin'],
    'shell',
  );
  assert.equal(shell.family, 'frontend-shell');
  assert.equal(shell.withLegacy, true);

  assert.throws(
    () => parseCreateArgs(['demo-app', '--with-legacy'], 'app'),
    /only valid for shell/,
  );
});

test('legacy create defaults to frontend-app', () => {
  const parsed = parseCreateArgs(['legacy-app']);
  assert.equal(parsed.family, 'frontend-app');
  assert.equal(parsed.familyExplicit, false);
  assert.equal(parsed.projectName, 'legacy-app');
});

test('help distinguishes app and shell', async () => {
  const root = await captureConsole(() => runHelp([]));
  assert.match(root, /frontend-app/);
  assert.match(root, /frontend-shell/);

  const appHelp = await captureConsole(() => runHelp(['app']));
  assert.match(appHelp, /g2rain-app-template/);
  assert.doesNotMatch(appHelp, /g2rain-shell-template/);

  const shellHelp = await captureConsole(() => runHelp(['shell']));
  assert.match(shellHelp, /g2rain-shell-template/);
  assert.match(shellHelp, /Does NOT use g2rain-app-template/);
  assert.match(shellHelp, /--port/);
  assert.match(shellHelp, /--with-legacy/);
});

test('legacy create prints default family notice', async () => {
  const sandbox = mkdtemp(path.join(os.tmpdir(), 'g2rain-cli-notice-'));
  const dir = await sandbox;
  const previousCwd = process.cwd();
  try {
    process.chdir(dir);
    const output = await captureConsole(() =>
      runCreate(['notice-app', '--context-path', 'notice']),
    );
    assert.match(output, /defaulting to frontend-app/);
  } finally {
    process.chdir(previousCwd);
    await rm(dir, { recursive: true, force: true });
  }
});

test('scaffold shell from bundled template-shell', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-cli-shell-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  delete process.env.G2RAIN_SHELL_TEMPLATE_PATH;
  const templateRoot = await resolveTemplateRoot('frontend-shell');
  assert.equal(templateRoot, path.join(repoRoot, 'template-shell'));
  assert.ok(await fs.pathExists(path.join(templateRoot, 'package.json')));

  const generated = path.join(sandbox, 'g2rain-demo-shell');
  await scaffoldProject(templateRoot, generated, {
    projectName: 'g2rain-demo-shell',
    contextPath: 'admin',
    family: 'frontend-shell',
    port: 3000,
  });

  const project = await readFile(path.join(generated, 'docs', 'project.yaml'), 'utf8');
  assert.match(project, /^family: frontend-shell$/m);
  assert.match(project, /^name: g2rain-demo-shell$/m);
  assert.match(project, /^\s*contextPath: \/admin$/m);
  assert.match(project, /^\s*devServerPort: 3000$/m);
  assert.match(project, /^\s*legacyCompatibility: false$/m);
  assert.match(project, /repository: "https:\/\/github.com\/g2rain\/g2rain-shell-template"/);
  const generationBlock =
    project.match(/\r?\ngeneration:\r?\n([\s\S]*?)(?=\r?\n[a-zA-Z]|\r?\n*$)/)?.[1] ?? '';
  assert.doesNotMatch(generationBlock, /g2rain-main-shell/);
  assert.doesNotMatch(generationBlock, /g2rain-app-template/);

  const required = [
    'AGENTS.md',
    'docs/development/platform-main-adoption.md',
    'docs/development/ui-theme-adoption.md',
    'src/shell/layout/TabBar.vue',
    'src/shell/menu.ts',
    'src/platform/main-platform.ts',
    'src/runtime/http/index.ts',
    'kits/README.md',
  ];
  for (const relative of required) {
    assert.ok(await fs.pathExists(path.join(generated, relative)), `missing ${relative}`);
  }
  assert.equal(await fs.pathExists(path.join(generated, 'src', 'platform', 'legacy')), false);
  assert.equal(await fs.pathExists(path.join(generated, '.g2rain-template-meta.json')), false);
  assert.equal(
    await fs.pathExists(path.join(generated, '.g2rain-template-snapshot.md')),
    false,
  );
  assert.equal(await fs.pathExists(path.join(generated, 'legacy-overlay')), false);

  const menu = await readFile(
    path.join(generated, 'src', 'platform', 'menus', 'shell-menus.ts'),
    'utf8',
  );
  assert.doesNotMatch(menu, /localhost:\d+/);
  assert.match(menu, /首页/);

  const env = await readFile(path.join(generated, '.env'), 'utf8');
  assert.match(env, /VITE_CONTEXT_PATH=\/admin/);
  assert.match(env, /VITE_SERVER_PORT=3000/);
});

test('scaffold shell with --with-legacy merges overlay', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-cli-shell-legacy-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  delete process.env.G2RAIN_SHELL_TEMPLATE_PATH;
  const templateRoot = await resolveTemplateRoot('frontend-shell');
  const generated = path.join(sandbox, 'g2rain-demo-shell-legacy');
  await scaffoldProject(templateRoot, generated, {
    projectName: 'g2rain-demo-shell-legacy',
    contextPath: 'admin',
    family: 'frontend-shell',
    port: 3000,
    withLegacy: true,
  });

  const project = await readFile(path.join(generated, 'docs', 'project.yaml'), 'utf8');
  assert.match(project, /^\s*legacyCompatibility: true$/m);

  const legacyRequired = [
    'src/platform/legacy/registry.ts',
    'src/platform/legacy/adapter.ts',
    'src/platform/legacy/README.md',
    'src/platform/legacy/adapter.test.ts',
    'src/components/micro-app/legacy-message-bridge.ts',
  ];
  for (const relative of legacyRequired) {
    assert.ok(await fs.pathExists(path.join(generated, relative)), `missing ${relative}`);
  }

  const extensions = await readFile(
    path.join(generated, 'src', 'runtime', 'shell-extensions.ts'),
    'utf8',
  );
  assert.match(extensions, /createLegacyAwareAdapterResolver/);
  assert.match(extensions, /startLegacyMessageBridge/);

  const deviations = await readFile(
    path.join(generated, 'docs', 'architecture', 'deviations.md'),
    'utf8',
  );
  assert.match(deviations, /TPL-LEGACY-010/);

  const pkg = JSON.parse(await readFile(path.join(generated, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['test:legacy'], /adapter\.test\.ts/);

  const readme = await readFile(path.join(generated, 'README.md'), 'utf8');
  assert.match(readme, /Legacy compatibility/);
});

test('scaffold app still uses app template family', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-cli-app-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  delete process.env.G2RAIN_TEMPLATE_PATH;
  const templateRoot = await resolveTemplateRoot('frontend-app');
  assert.equal(templateRoot, path.join(repoRoot, 'template'));

  const generated = path.join(sandbox, 'g2rain-demo-app');
  await scaffoldProject(templateRoot, generated, {
    projectName: 'g2rain-demo-app',
    contextPath: 'demo',
    family: 'frontend-app',
  });

  const project = await readFile(path.join(generated, 'docs', 'project.yaml'), 'utf8');
  assert.match(project, /^family: frontend-app$/m);
  assert.match(project, /g2rain-app-template/);
  assert.doesNotMatch(project, /frontend-shell/);
  assert.equal(await fs.pathExists(path.join(generated, '.g2rain-template-meta.json')), false);
  assert.equal(
    await fs.pathExists(path.join(generated, '.g2rain-template-snapshot.md')),
    false,
  );
});
