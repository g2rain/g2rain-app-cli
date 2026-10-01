import path from 'node:path';
import kleur from 'kleur';
import { generateConfig } from '../tools/build-config/index.js';

export interface BuildConfigCliOptions {
  cwd: string;
  routeMapPath: string;
  viewsDir: string;
  outputDir: string;
}

export function parseBuildConfigArgs(argv: string[]): BuildConfigCliOptions {
  let cwd = process.cwd();
  let routeMapRel = 'src/views/route-map.ts';
  let viewsRel = 'src/views';
  let outRel = 'src/shared/config-util/config';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--cwd=')) {
      cwd = path.resolve(arg.slice('--cwd='.length));
    } else if (arg === '--cwd') {
      cwd = path.resolve(argv[++i]);
    } else if (arg.startsWith('--route-map=')) {
      routeMapRel = arg.slice('--route-map='.length);
    } else if (arg === '--route-map') {
      routeMapRel = argv[++i];
    } else if (arg.startsWith('--views=')) {
      viewsRel = arg.slice('--views='.length);
    } else if (arg === '--views') {
      viewsRel = argv[++i];
    } else if (arg.startsWith('--out=')) {
      outRel = arg.slice('--out='.length);
    } else if (arg === '--out') {
      outRel = argv[++i];
    } else {
      throw new Error(`Unknown option for build-config: ${arg}`);
    }
  }

  return {
    cwd,
    routeMapPath: path.resolve(cwd, routeMapRel),
    viewsDir: path.resolve(cwd, viewsRel),
    outputDir: path.resolve(cwd, outRel),
  };
}

export async function runBuildConfig(argv: string[]): Promise<void> {
  try {
    const options = parseBuildConfigArgs(argv);
    console.log(kleur.cyan('🚀 开始生成资源配置...'));
    console.log('📁 路由映射文件:', options.routeMapPath);
    console.log('📁 视图目录:', options.viewsDir);
    console.log('📁 输出目录:', options.outputDir);

    await generateConfig({
      routeMapPath: options.routeMapPath,
      viewsDir: options.viewsDir,
      outputDir: options.outputDir,
    });

    console.log(kleur.green('✅ 资源配置生成完成！'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(kleur.red(`❌ 生成失败: ${message}`));
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}
