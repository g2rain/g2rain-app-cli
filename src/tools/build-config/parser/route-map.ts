import fs from 'node:fs';
import type { ResourcePage } from '../../../types/resource.js';

function pathToPageCode(routePath: string): string {
  return routePath.replace(/^\//, '').replace(/\//g, '-').toLowerCase();
}

export async function parseRouteMap(routeMapPath: string): Promise<ResourcePage[]> {
  const content = fs.readFileSync(routeMapPath, 'utf-8');
  const pages: ResourcePage[] = [];

  const routeMapMatch = content.match(/export const routeMap[^=]*=\s*\{([\s\S]*?)\};/);
  if (!routeMapMatch) {
    throw new Error('无法找到 routeMap');
  }

  const routeMapContent = routeMapMatch[1];
  const routePattern =
    /'([^']+)':\s*\{[\s\S]*?meta:\s*\{[\s\S]*?(?:titleDefault:\s*'([^']+)'|title:\s*'([^']+)')/g;
  let match: RegExpExecArray | null;

  while ((match = routePattern.exec(routeMapContent)) !== null) {
    const routePath = match[1];
    const title = match[2] || match[3];

    if (routePath === '/' || routePath === '/home') {
      continue;
    }

    pages.push({
      pageName: title,
      pageCode: pathToPageCode(routePath),
      linkPath: routePath,
    });
  }

  return pages;
}
