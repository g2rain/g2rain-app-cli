import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import type { TableInfo } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Prefer dist/tools/generate/templates (after copy); fall back to src path when developing. */
export function resolveTemplatesDir(): string {
  const nextToDist = path.resolve(__dirname, 'templates');
  if (fs.existsSync(nextToDist)) return nextToDist;
  const fromSrc = path.resolve(__dirname, '../../../src/tools/generate/templates');
  if (fs.existsSync(fromSrc)) return fromSrc;
  throw new Error(`Generate templates not found near ${__dirname}`);
}

export function renderTemplate(
  templatesDir: string,
  templateName: string,
  data: { table: TableInfo },
): string {
  const templatePath = path.resolve(templatesDir, `${templateName}.ejs`);
  const template = fs.readFileSync(templatePath, 'utf-8');
  return ejs.render(template, data);
}
