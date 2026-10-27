import fs from 'node:fs';
import path from 'node:path';
import { loadTableInfos } from './context.js';
import { renderTemplate } from './loader.js';
import { updateRouteMap } from './route.js';
import type { GenerateOptions, GeneratePaths, TableInfo } from './types.js';

export async function generateCode(
  tables: string[],
  paths: GeneratePaths,
  options: GenerateOptions = {},
): Promise<void> {
  const { view = true, api = true, mock = true, route = true } = options;

  // 写任何文件前先校验表名并解析全部表，缺表直接失败
  const infos = loadTableInfos(tables, paths);

  if (view) generateView(infos, paths);
  if (api) generateApi(infos, paths);
  if (mock) generateMock(infos, paths);
  if (route) generateRoute(infos, paths);
}

function generateView(infos: TableInfo[], paths: GeneratePaths): void {
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

function generateApi(infos: TableInfo[], paths: GeneratePaths): void {
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

function generateMock(infos: TableInfo[], paths: GeneratePaths): void {
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

function generateRoute(infos: TableInfo[], paths: GeneratePaths): void {
  updateRouteMap(infos, paths.routeMapPath);
  console.log('✓ route-map.ts 已更新');
}
