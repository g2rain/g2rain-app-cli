import fs from 'node:fs';
import path from 'node:path';
import { loadTableInfos } from './context.js';
import { renderTemplate } from './loader.js';
import { updateRouteMap } from './route.js';
import type { GenerateOptions, GeneratePaths } from './types.js';

export async function generateCode(
  tables: string[],
  paths: GeneratePaths,
  options: GenerateOptions = {},
): Promise<void> {
  const { view = true, api = true, mock = true, route = true } = options;

  if (view) await generateView(tables, paths);
  if (api) await generateApi(tables, paths);
  if (mock) await generateMock(tables, paths);
  if (route) await generateRoute(tables, paths);
}

async function generateView(tables: string[], paths: GeneratePaths): Promise<void> {
  const infos = loadTableInfos(tables, paths);
  for (const info of infos) {
    const dir = path.join(paths.viewsDir, info.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.vue'),
      renderTemplate(paths.templatesDir, 'view', { table: info }),
      'utf-8',
    );
    console.log(`✓ view 已生成: ${info.name}`);
  }
}

async function generateApi(tables: string[], paths: GeneratePaths): Promise<void> {
  const infos = loadTableInfos(tables, paths);
  for (const info of infos) {
    const dir = path.join(paths.viewsDir, info.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'api.ts'),
      renderTemplate(paths.templatesDir, 'api', { table: info }),
    );
    fs.writeFileSync(
      path.join(dir, 'type.ts'),
      renderTemplate(paths.templatesDir, 'type', { table: info }),
    );
    console.log(`✓ api/type 已生成: ${info.name}`);
  }
}

async function generateMock(tables: string[], paths: GeneratePaths): Promise<void> {
  const infos = loadTableInfos(tables, paths);
  for (const info of infos) {
    const dir = path.join(paths.viewsDir, info.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'mock.ts'),
      renderTemplate(paths.templatesDir, 'mock', { table: info }),
    );
    console.log(`✓ mock 已生成: ${info.name}`);
  }
}

async function generateRoute(tables: string[], paths: GeneratePaths): Promise<void> {
  const infos = loadTableInfos(tables, paths);
  updateRouteMap(infos, paths.routeMapPath);
  console.log('✓ route-map.ts 已更新');
}
