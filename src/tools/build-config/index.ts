import fs from 'node:fs';
import { parseRouteMap } from './parser/route-map.js';
import { parseVueFiles } from './parser/vue.js';
import { generateJsonFiles } from './generator/json.js';

export interface GenerateConfigOptions {
  routeMapPath: string;
  viewsDir: string;
  outputDir: string;
}

export async function generateConfig(options: GenerateConfigOptions): Promise<void> {
  const { routeMapPath, viewsDir, outputDir } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📖 解析路由映射文件...');
  const pages = await parseRouteMap(routeMapPath);
  console.log(`   ✓ 找到 ${pages.length} 个页面资源`);

  console.log('📖 解析 Vue 文件中的权限指令...');
  const pageElements = await parseVueFiles(viewsDir, pages);
  console.log(`   ✓ 找到 ${pageElements.length} 个页面元素`);

  // API endpoint parsing remains disabled (same as App tooling).

  console.log('📝 生成 JSON 配置文件...');
  await generateJsonFiles(outputDir, {
    pages,
    pageElements,
  });
  console.log('   ✓ 配置文件生成完成');
}
