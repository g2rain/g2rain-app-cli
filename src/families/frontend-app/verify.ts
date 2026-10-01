import path from 'node:path';
import fs from 'fs-extra';

/** Minimal post-scaffold checks for frontend-app. */
export async function verifyFrontendApp(targetDir: string): Promise<void> {
  if (!(await fs.pathExists(path.join(targetDir, 'package.json')))) {
    throw new Error('frontend-app scaffold missing required file: package.json');
  }

  const projectYamlPath = path.join(targetDir, 'docs/project.yaml');
  if (!(await fs.pathExists(projectYamlPath))) {
    throw new Error('frontend-app scaffold missing required file: docs/project.yaml');
  }

  const projectYaml = await fs.readFile(projectYamlPath, 'utf-8');
  if (!/^family:\s*frontend-app\s*$/m.test(projectYaml)) {
    throw new Error('frontend-app scaffold must set family: frontend-app in docs/project.yaml');
  }
}
