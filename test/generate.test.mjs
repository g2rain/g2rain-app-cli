import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { generateCode } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'tools', 'generate', 'index.js')).href
);
const { resolveTemplatesDir } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'tools', 'generate', 'loader.js')).href
);

test('generate creates view files and updates route-map', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-generate-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const sql = `
CREATE TABLE \`demo_item\` (
  \`id\` bigint NOT NULL COMMENT 'ID',
  \`name\` varchar(64) DEFAULT NULL COMMENT '名称',
  \`create_time\` datetime DEFAULT NULL COMMENT '创建时间',
  \`update_time\` datetime DEFAULT NULL COMMENT '更新时间',
  \`version\` int DEFAULT NULL COMMENT '版本',
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB COMMENT='演示项';
`;
  const sqlPath = path.join(sandbox, 'database.sql');
  const viewsDir = path.join(sandbox, 'views');
  const routeMapPath = path.join(sandbox, 'route-map.ts');
  await writeFile(sqlPath, sql, 'utf8');
  await mkdir(viewsDir, { recursive: true });
  await writeFile(
    routeMapPath,
    `export const routeMap = {
  '/': {
    component: () => import('@/views/Home.vue'),
    name: 'Home',
    meta: { title: '首页', requiresAuth: true },
  },
};
`,
    'utf8',
  );

  await generateCode(
    ['demo_item'],
    {
      cwd: sandbox,
      sqlPath,
      viewsDir,
      routeMapPath,
      templatesDir: resolveTemplatesDir(),
    },
    { view: true, api: true, mock: true, route: true },
  );

  const vue = await readFile(path.join(viewsDir, 'demo_item', 'index.vue'), 'utf8');
  assert.match(vue, /demo_item|演示/);
  const api = await readFile(path.join(viewsDir, 'demo_item', 'api.ts'), 'utf8');
  assert.match(api, /DemoItem/);
  const routeMap = await readFile(routeMapPath, 'utf8');
  assert.match(routeMap, /'\/demo_item'/);
});

async function setupSandbox(t) {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'g2rain-generate-fail-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const sqlPath = path.join(sandbox, 'database.sql');
  const viewsDir = path.join(sandbox, 'src', 'views');
  const routeMapPath = path.join(viewsDir, 'route-map.ts');
  await mkdir(viewsDir, { recursive: true });
  await writeFile(
    sqlPath,
    'CREATE TABLE `demo_item` (\n  `id` bigint NOT NULL COMMENT \'ID\',\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB COMMENT=\'演示项\';\n',
    'utf8',
  );
  const routeMap = 'export const routeMap = {};\n';
  await writeFile(routeMapPath, routeMap, 'utf8');
  return {
    sandbox,
    viewsDir,
    routeMap,
    paths: { cwd: sandbox, sqlPath, viewsDir, routeMapPath, templatesDir: resolveTemplatesDir() },
  };
}

test('generate fails on missing table before writing any file', async (t) => {
  const { viewsDir, routeMap, paths } = await setupSandbox(t);
  await assert.rejects(
    () => generateCode(['demo_item', 'missing_table'], paths),
    /未找到表: missing_table/,
  );
  assert.deepEqual(await readdir(viewsDir), ['route-map.ts']);
  assert.equal(await readFile(paths.routeMapPath, 'utf8'), routeMap);
});

test('generate rejects table names that are not SQL identifiers', async (t) => {
  const { sandbox, viewsDir, paths } = await setupSandbox(t);
  for (const table of ['../../x', 'a/b', '1abc', 'a-b', '..']) {
    await assert.rejects(() => generateCode([table], paths), /表名不合法/, table);
  }
  assert.deepEqual(await readdir(viewsDir), ['route-map.ts']);
  assert.deepEqual((await readdir(sandbox)).sort(), ['database.sql', 'src']);
});
