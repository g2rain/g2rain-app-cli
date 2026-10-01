import type { TableInfo, TableColumn } from './types.js';

export function parseTable(sql: string, tableName: string): TableInfo {
  const lines = sql.split('\n').map((l) => l.trim()).filter(Boolean);

  const columns: TableColumn[] = [];
  let inColumns = false;
  let tableComment = '';
  const normalized = tableName.toLowerCase();

  for (const line of lines) {
    const createMatch = line.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
    if (createMatch && createMatch[1]?.toLowerCase() === normalized) {
      inColumns = true;
      continue;
    }

    if (inColumns) {
      if (/^\)\s*ENGINE\b/i.test(line)) {
        const tc = line.match(/COMMENT\s*=\s*(['"])(.*?)\1/i);
        tableComment = (tc && tc[2]) || '';
        break;
      }

      if (
        line.startsWith('PRIMARY KEY') ||
        line.startsWith('UNIQUE KEY') ||
        line.startsWith('UNIQUE INDEX') ||
        line.startsWith('KEY') ||
        line.startsWith('INDEX') ||
        line.startsWith('CONSTRAINT') ||
        line.startsWith('FOREIGN KEY')
      ) {
        continue;
      }

      if (line === ')' || line.startsWith(');')) {
        break;
      }

      const match = line.match(
        /^`(\w+)`\s+(\w+(?:\([^)]+\))?)\s+((?:(?!\s+COMMENT\b).)*?)(?:\s+COMMENT\s+(["'])(.*?)\4)?\s*,?\s*$/i,
      );

      if (!match) continue;

      const [, name, sqlType, rest, , comment] = match;
      const camelName = snakeToCamel(name);
      const upperRest = rest.toUpperCase();
      const nullable =
        (!upperRest.includes('NOT NULL') && upperRest.includes('NULL')) ||
        upperRest.includes('DEFAULT NULL');

      const isBaseField = ['id', 'create_time', 'update_time', 'version'].includes(
        name.toLowerCase(),
      );
      const isDeleteFlag = name.toLowerCase().includes('delete_flag');

      let tsType = 'string';
      if (sqlType.toLowerCase().includes('int')) tsType = 'number';
      if (sqlType.toLowerCase().includes('tinyint(1)') || isDeleteFlag) {
        tsType = 'boolean';
      }

      columns.push({
        name,
        camelName,
        type: tsType,
        nullable,
        comment: comment || '',
        isBaseField,
        isDeleteFlag,
      });
    }
  }

  const baseColumns = columns.filter((c) => c.isBaseField);
  const businessColumns = columns.filter((c) => !c.isBaseField);
  const normalizedTableName = tableName.toLowerCase();
  const camelName = snakeToPascal(normalizedTableName);

  return {
    name: normalizedTableName,
    camelName,
    routePath: `/${normalizedTableName}`,
    routeName: camelName,
    tableComment,
    title: getTitleFromComment(
      tableComment || columns.find((c) => c.name === 'name')?.comment || normalizedTableName,
    ),
    columns,
    baseColumns,
    businessColumns,
  };
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}

function snakeToPascal(str: string): string {
  const c = snakeToCamel(str);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function getTitleFromComment(comment: string): string {
  const m = comment.match(/[\u4e00-\u9fa5]+/);
  return m ? m[0] : comment;
}
