import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { generateConfig } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'tools', 'build-config', 'index.js')).href
);

test('build-config writes resources pages and page-elements', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-build-config-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const viewsDir = path.join(sandbox, 'views');
  const pageDir = path.join(viewsDir, 'demo');
  const outDir = path.join(sandbox, 'config');
  const routeMapPath = path.join(sandbox, 'route-map.ts');
  await mkdir(pageDir, { recursive: true });
  await writeFile(
    routeMapPath,
    `export const routeMap = {
  '/': { component: () => import('@/views/Home.vue'), name: 'Home', meta: { title: '首页' } },
  '/demo': {
    component: () => import('@/views/demo/index.vue'),
    name: 'Demo',
    meta: { title: '演示页', requiresAuth: true },
  },
};
`,
    'utf8',
  );
  await writeFile(
    path.join(pageDir, 'index.vue'),
    `<template>
  <el-button v-permission="'demo:add'">Add</el-button>
  <el-button v-permission="'demo:edit'">Edit</el-button>
</template>
`,
    'utf8',
  );

  await generateConfig({ routeMapPath, viewsDir, outputDir: outDir });

  const resources = JSON.parse(await readFile(path.join(outDir, 'resources.json'), 'utf8'));
  assert.equal(resources.pages.length, 1);
  assert.equal(resources.pages[0].pageCode, 'demo');
  assert.equal(resources.pageElements.length, 2);
  assert.ok(resources.pageElements.some((e) => e.pageElementCode === 'demo:add'));
  assert.deepEqual(resources.apiEndpoints, []);

  const pages = JSON.parse(await readFile(path.join(outDir, 'pages.json'), 'utf8'));
  assert.equal(pages.length, 1);
  const elements = JSON.parse(await readFile(path.join(outDir, 'page-elements.json'), 'utf8'));
  assert.equal(elements.length, 2);
});
