import fs from 'node:fs';
import path from 'node:path';
import type { ResourcePage, ResourcePageElement } from '../../../types/resource.js';

function collectVueFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    return [];
  }
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...collectVueFiles(full));
    } else if (e.isFile() && e.name.endsWith('.vue')) {
      out.push(full);
    }
  }
  return out;
}

function normalizePermissionRaw(raw: string): string | null {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed || trimmed.startsWith(':') || trimmed.includes('{{') || trimmed.includes('${')) {
    return null;
  }
  return trimmed.includes(':') ? trimmed : null;
}

function collectByPatterns(content: string, patterns: RegExp[], codes: Set<string>) {
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const code = normalizePermissionRaw(m[1]);
      if (code) {
        codes.add(code);
      }
    }
  }
}

function extractPermissionCodes(content: string): string[] {
  const codes = new Set<string>();
  collectByPatterns(
    content,
    [
      /v-permission\s*=\s*"'([^'\\]*)'"/g,
      /v-permission\s*=\s*'"([^"\\]*)"'/g,
      /v-permission\s*=\s*"([^"]*)"/g,
      /v-permission\s*=\s*'([^']*)'/g,
    ],
    codes,
  );
  return [...codes];
}

function permissionAction(permissionCode: string): string {
  const i = permissionCode.indexOf(':');
  return i >= 0 ? permissionCode.slice(i + 1) : permissionCode;
}

function getActionName(action: string): string {
  const actionMap: Record<string, string> = {
    add: '新增',
    edit: '编辑',
    delete: '删除',
    view: '查看',
    detail: '明细',
    export: '导出',
    import: '导入',
    save: '保存',
    cancel: '取消',
    search: '查询',
    reset: '重置',
    items: '字典项',
    status_update: '状态变更',
  };
  return actionMap[action] || action;
}

function getPageElementType(action: string): string {
  if (action === 'status_update') {
    return 'switch';
  }
  return 'button';
}

function parseVueFile(filePath: string, hostPageCode: string): ResourcePageElement[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const codes = extractPermissionCodes(content);
  const elements: ResourcePageElement[] = [];

  for (const permissionCode of codes) {
    const action = permissionAction(permissionCode);
    elements.push({
      parentId: null,
      pageElementName: getActionName(action),
      pageElementCode: permissionCode,
      pageElementType: getPageElementType(action),
      pageCode: hostPageCode,
      status: 'ENABLED',
    });
  }

  return elements;
}

export async function parseVueFiles(
  viewsDir: string,
  pages: ResourcePage[],
): Promise<ResourcePageElement[]> {
  const byCode = new Map<string, ResourcePageElement>();

  for (const page of pages) {
    const routePath = page.linkPath.replace(/^\//, '');
    const pageRoot = path.join(viewsDir, routePath);
    const vueFiles = collectVueFiles(pageRoot);

    if (vueFiles.length === 0) {
      if (!fs.existsSync(path.join(pageRoot, 'index.vue'))) {
        console.warn(`   ⚠️  未找到任何 Vue 文件于目录: ${pageRoot}`);
      }
      continue;
    }

    console.log(`   📂 ${page.pageCode} (${pageRoot}): ${vueFiles.length} 个 .vue`);

    for (const vueFilePath of vueFiles) {
      const rel = path.relative(viewsDir, vueFilePath);
      const elements = parseVueFile(vueFilePath, page.pageCode);
      if (elements.length > 0) {
        console.log(`      📄 ${rel} → ${elements.length} 个权限元素`);
      }
      for (const el of elements) {
        if (!byCode.has(el.pageElementCode)) {
          byCode.set(el.pageElementCode, el);
        }
      }
    }
  }

  return [...byCode.values()].sort((a, b) =>
    a.pageElementCode.localeCompare(b.pageElementCode, 'en'),
  );
}
