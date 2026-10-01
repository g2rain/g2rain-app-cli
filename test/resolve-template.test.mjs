import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {
  resolveBundledTemplateRoot,
  resolveTemplateRoot,
} = await import(pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href);

test('bundled template resolves to package template/ with package.json', async () => {
  delete process.env.G2RAIN_TEMPLATE_PATH;
  const bundled = resolveBundledTemplateRoot();
  assert.equal(bundled, path.join(repoRoot, 'template'));
  const root = await resolveTemplateRoot();
  assert.equal(root, bundled);
});

test('bundled shell template resolves to package template-shell/', async () => {
  delete process.env.G2RAIN_SHELL_TEMPLATE_PATH;
  const bundled = resolveBundledTemplateRoot('frontend-shell');
  assert.equal(bundled, path.join(repoRoot, 'template-shell'));
  const root = await resolveTemplateRoot('frontend-shell');
  assert.equal(root, bundled);
});

test('G2RAIN_TEMPLATE_PATH overrides bundled template', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-template-override-'));
  t.after(async () => {
    delete process.env.G2RAIN_TEMPLATE_PATH;
    await rm(sandbox, { recursive: true, force: true });
  });

  await writeFile(
    path.join(sandbox, 'package.json'),
    JSON.stringify({ name: 'override-template' }),
  );
  process.env.G2RAIN_TEMPLATE_PATH = sandbox;
  const root = await resolveTemplateRoot();
  assert.equal(root, path.resolve(sandbox));
});

test('invalid G2RAIN_TEMPLATE_PATH fails', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-template-missing-'));
  t.after(async () => {
    delete process.env.G2RAIN_TEMPLATE_PATH;
    await rm(sandbox, { recursive: true, force: true });
  });
  await mkdir(sandbox, { recursive: true });
  process.env.G2RAIN_TEMPLATE_PATH = sandbox;
  await assert.rejects(() => resolveTemplateRoot(), /package\.json/);
});
