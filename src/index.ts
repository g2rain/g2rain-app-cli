#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';
import { parseTopLevel } from './cli/parse.js';
import { runCreate, runHelp } from './commands/create.js';
import { runGenerate } from './commands/generate.js';
import { runBuildConfig } from './commands/build-config.js';
import { isDirectExecution } from './shared/execution.js';

export { scaffoldProject } from './scaffold/project.js';
export { resolveTemplateRoot, resolveBundledTemplateRoot } from './scaffold/resolve-template-root.js';
export { isDirectExecution } from './shared/execution.js';
export { getFamily, listFamilies, printRootHelp } from './families/registry.js';

async function printVersion(): Promise<void> {
  const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  const pkg = await fs.readJson(pkgPath);
  console.log(String(pkg.version));
}

async function main(): Promise<void> {
  const parsed = parseTopLevel(process.argv);

  switch (parsed.command) {
    case 'create':
      await runCreate(parsed.args, parsed.familyAlias);
      return;
    case 'generate':
      await runGenerate(parsed.args);
      return;
    case 'build-config':
      await runBuildConfig(parsed.args);
      return;
    case 'help':
      runHelp(parsed.args);
      return;
    case 'version':
      await printVersion();
      return;
  }
}

if (isDirectExecution()) {
  main().catch((err) => {
    console.error(kleur.red('✖ Command failed'));
    console.error(err);
    process.exit(1);
  });
}
