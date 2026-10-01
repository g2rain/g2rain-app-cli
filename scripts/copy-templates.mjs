import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcTemplates = path.join(root, 'src', 'tools', 'generate', 'templates');
const distTemplates = path.join(root, 'dist', 'tools', 'generate', 'templates');

fs.mkdirSync(distTemplates, { recursive: true });
for (const name of fs.readdirSync(srcTemplates)) {
  if (!name.endsWith('.ejs')) continue;
  fs.copyFileSync(path.join(srcTemplates, name), path.join(distTemplates, name));
}
console.log(`Copied generate templates → ${distTemplates}`);
