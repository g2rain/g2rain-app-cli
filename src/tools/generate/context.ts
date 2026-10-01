import fs from 'node:fs';
import { parseTable } from './parse-table.js';
import type { GeneratePaths, TableInfo } from './types.js';

export function loadTableInfos(tables: string[], paths: GeneratePaths): TableInfo[] {
  const sql = fs.readFileSync(paths.sqlPath, 'utf-8');
  return tables.map((table) => {
    console.log(`→ 解析表 ${table}`);
    return parseTable(sql, table);
  });
}
