import fs from 'node:fs';
import { parseTable } from './parse-table.js';
import type { GeneratePaths, TableInfo } from './types.js';

/** 表名同时作为 views 下的目录名，限制为 SQL 标识符，防止目录逃逸。 */
const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function loadTableInfos(tables: string[], paths: GeneratePaths): TableInfo[] {
  for (const table of tables) {
    if (!TABLE_NAME.test(table)) {
      throw new Error(`表名不合法: ${table}（仅允许字母、数字和下划线，且不能以数字开头）`);
    }
  }
  const sql = fs.readFileSync(paths.sqlPath, 'utf-8');
  return tables.map((table) => {
    console.log(`→ 解析表 ${table}`);
    return parseTable(sql, table);
  });
}
