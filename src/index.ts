#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import prompts from 'prompts';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CliArgs {
  projectName?: string;
  contextPath?: string;
}

interface TemplateVars {
  projectName: string;
  contextPath: string;
}

const filterCopy = (src: string) => {
  const basename = path.basename(src);
  const blocked = ['node_modules', 'dist', '.git', '.DS_Store', 'package-lock.json'];
  if (blocked.includes(basename)) return false;
  return true;
};

async function ensureProjectName(initial?: string) {
  if (initial) return initial;
  const { name } = await prompts({
    type: 'text',
    name: 'name',
    message: 'Project name',
    initial: 'g2rain-new-app',
  });
  return name;
}

async function copyTemplate(templateRoot: string, targetDir: string) {
  await fs.copy(templateRoot, targetDir, { filter: filterCopy });
}

async function rewritePackageJson(targetDir: string, projectName: string) {
  const pkgPath = path.join(targetDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) return;
  const pkg = await fs.readJson(pkgPath);
  pkg.name = projectName;
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
}

async function replaceTemplatePlaceholders(targetDir: string, projectName: string) {
  const files = [
    'lua/config.lua',
    'README.md',
    '.env',
    '.env.production',
    'vite.config.ts',
    'src/runtime/env/index.ts',
  ];

  await Promise.all(
    files.map(async (relativePath) => {
      const filePath = path.join(targetDir, relativePath);
      if (!(await fs.pathExists(filePath))) return;

      const content = await fs.readFile(filePath, 'utf-8');
      const replaced = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
      await fs.writeFile(filePath, replaced, 'utf-8');
    })
  );
}

async function cloneTemplateFromGitHub(templateRoot: string): Promise<void> {
  const templateRepo = 'https://github.com/g2rain/g2rain-app-template';
  const templateDir = path.dirname(templateRoot);
  
  console.log(kleur.cyan(`➜ Cloning template from ${templateRepo}...`));
  
  try {
    // 确保模板目录的父目录存在
    await fs.ensureDir(templateDir);
    
    // 使用 git clone 克隆仓库
    execSync(`git clone ${templateRepo} "${templateRoot}"`, {
      stdio: 'inherit',
      cwd: templateDir,
    });
    
    console.log(kleur.green('✔ Template cloned successfully'));
  } catch (error: any) {
    console.error(kleur.red('✖ Failed to clone template from GitHub'));
    if (error.message) {
      console.error(kleur.red(error.message));
    }
    throw error;
  }
}

async function main() {
  const projectName = await ensureProjectName(process.argv[2]);
  if (!projectName) {
    console.error(kleur.red('✖ Project name is required'));
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(targetDir)) {
    console.error(kleur.red(`✖ Target directory already exists: ${targetDir}`));
    process.exit(1);
  }

  const templateRoot =
    process.env.G2RAIN_TEMPLATE_PATH ||
    path.resolve(__dirname, '..', '..', 'g2rain-app-template');

  if (!(await fs.pathExists(templateRoot))) {
    console.log(
      kleur.yellow(
        `⚠ Template not found at ${templateRoot}. Attempting to clone from GitHub...`,
      ),
    );
    
    try {
      await cloneTemplateFromGitHub(templateRoot);
    } catch (error) {
      console.error(
        kleur.red(
          `✖ Failed to clone template. Please ensure git is installed and the repository is accessible.`,
        ),
      );
      console.error(
        kleur.red(
          `You can also set G2RAIN_TEMPLATE_PATH to use a local template directory.`,
        ),
      );
      process.exit(1);
    }
  }

  console.log(kleur.cyan(`➜ Using template: ${templateRoot}`));
  await copyTemplate(templateRoot, targetDir);
  await rewritePackageJson(targetDir, projectName);
  await replaceTemplatePlaceholders(targetDir, projectName);

  console.log(kleur.green(`\n✔ Project created at ${targetDir}`));
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run dev');
  console.log('\nTip: set G2RAIN_TEMPLATE_PATH to use a remote/template directory when publishing.');
}

main().catch((err) => {
  console.error(kleur.red('✖ Failed to create project'));
  console.error(err);
  process.exit(1);
});

