import path from 'node:path';
import fs from 'fs-extra';
import kleur from 'kleur';
import { generateCode } from '../tools/generate/index.js';
import { resolveTemplatesDir } from '../tools/generate/loader.js';

export interface GenerateCliOptions {
  tables: string[];
  cwd: string;
  sqlPath: string;
  viewsDir: string;
  routeMapPath: string;
  view: boolean;
  api: boolean;
  mock: boolean;
  route: boolean;
}

export function parseGenerateArgs(argv: string[]): GenerateCliOptions {
  let tablesArg: string | undefined;
  let cwd = process.cwd();
  let sqlRel = 'scripts/database.sql';
  let viewsRel = 'src/views';
  let routeMapRel = 'src/views/route-map.ts';
  let view = true;
  let api = true;
  let mock = true;
  let route = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--tables=')) {
      tablesArg = arg.slice('--tables='.length);
    } else if (arg === '--tables') {
      tablesArg = argv[++i];
    } else if (arg.startsWith('--cwd=')) {
      cwd = path.resolve(arg.slice('--cwd='.length));
    } else if (arg === '--cwd') {
      cwd = path.resolve(argv[++i]);
    } else if (arg.startsWith('--sql=')) {
      sqlRel = arg.slice('--sql='.length);
    } else if (arg === '--sql') {
      sqlRel = argv[++i];
    } else if (arg.startsWith('--views=')) {
      viewsRel = arg.slice('--views='.length);
    } else if (arg === '--views') {
      viewsRel = argv[++i];
    } else if (arg.startsWith('--route-map=')) {
      routeMapRel = arg.slice('--route-map='.length);
    } else if (arg === '--route-map') {
      routeMapRel = argv[++i];
    } else if (arg === '--no-view' || arg === '--skip-view') {
      view = false;
    } else if (arg === '--no-api' || arg === '--skip-api') {
      api = false;
    } else if (arg === '--no-mock' || arg === '--skip-mock') {
      mock = false;
    } else if (arg === '--no-route' || arg === '--skip-route') {
      route = false;
    } else {
      throw new Error(`Unknown option for generate: ${arg}`);
    }
  }

  if (!tablesArg) {
    tablesArg = process.env.G2RAIN_TABLES?.trim() || undefined;
  }

  if (!tablesArg) {
    throw new Error('缺少 --tables 参数。用法: --tables=user,role 或 --tables user,role');
  }
  const tables = tablesArg.split(',').map((s) => s.trim()).filter(Boolean);
  if (tables.length === 0) {
    throw new Error('--tables 参数不能为空');
  }

  return {
    tables,
    cwd,
    sqlPath: path.resolve(cwd, sqlRel),
    viewsDir: path.resolve(cwd, viewsRel),
    routeMapPath: path.resolve(cwd, routeMapRel),
    view,
    api,
    mock,
    route,
  };
}

export async function runGenerate(argv: string[]): Promise<void> {
  try {
    const options = parseGenerateArgs(argv);
    if (!(await fs.pathExists(options.sqlPath))) {
      throw new Error(`SQL 文件不存在: ${options.sqlPath}`);
    }

    console.log(kleur.cyan('\n🚀 开始生成代码...'));
    console.log(`📋 表名: ${options.tables.join(', ')}`);
    console.log(
      `📦 选项: view=${options.view}, api=${options.api}, mock=${options.mock}, route=${options.route}\n`,
    );

    await generateCode(
      options.tables,
      {
        cwd: options.cwd,
        sqlPath: options.sqlPath,
        viewsDir: options.viewsDir,
        routeMapPath: options.routeMapPath,
        templatesDir: resolveTemplatesDir(),
      },
      {
        view: options.view,
        api: options.api,
        mock: options.mock,
        route: options.route,
      },
    );

    console.log(kleur.green('\n✅ 代码生成完成！'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(kleur.red(`\n❌ 执行失败: ${message}`));
    process.exit(1);
  }
}
