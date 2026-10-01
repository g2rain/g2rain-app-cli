import { Project, SyntaxKind } from 'ts-morph';
import type { TableInfo } from './types.js';

export function updateRouteMap(tables: TableInfo[], routeMapPath: string): void {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(routeMapPath);

  for (const table of tables) {
    const routePath = table.routePath;
    const routeName = table.routeName;
    const title = table.title;
    const viewPath = `@/views/${table.name}/index.vue`;

    const routeMap = sourceFile.getVariableDeclaration('routeMap');
    if (routeMap) {
      const initializer = routeMap.getInitializer();
      if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const objLiteral = initializer.asKind(SyntaxKind.ObjectLiteralExpression);
        const existing =
          objLiteral?.getProperty(`'${routePath}'`) || objLiteral?.getProperty(routePath);
        if (existing) {
          console.log(`[skip] 路由已存在: ${routePath}`);
        } else {
          objLiteral?.addPropertyAssignment({
            name: `'${routePath}'`,
            initializer: `{
    component: () => import('${viewPath}'),
    name: '${routeName}',
    meta: { title: '${title.replace(/'/g, "\\'")}', requiresAuth: true, showInHome: true },
}`,
          });
        }
      }
    }
  }

  sourceFile.saveSync();
}
