import fs from 'node:fs';
import path from 'node:path';
import type {
  ApplicationResources,
  ResourceApiEndpoint,
  ResourcePage,
  ResourcePageElement,
} from '../../../types/resource.js';

export interface ResourceData {
  pages: ResourcePage[];
  pageElements: ResourcePageElement[];
  apiEndpoints?: ResourceApiEndpoint[];
}

export async function generateJsonFiles(outputDir: string, data: ResourceData): Promise<void> {
  const resources: ApplicationResources = {
    pages: data.pages,
    pageElements: data.pageElements,
    apiEndpoints: data.apiEndpoints || [],
  };

  const resourcesPath = path.join(outputDir, 'resources.json');
  fs.writeFileSync(resourcesPath, JSON.stringify(resources, null, 2), 'utf-8');
  console.log(`   ✓ 生成 ${resourcesPath}`);

  const pagesPath = path.join(outputDir, 'pages.json');
  fs.writeFileSync(pagesPath, JSON.stringify(data.pages, null, 2), 'utf-8');
  console.log(`   ✓ 生成 ${pagesPath}`);

  const pageElementsPath = path.join(outputDir, 'page-elements.json');
  fs.writeFileSync(pageElementsPath, JSON.stringify(data.pageElements, null, 2), 'utf-8');
  console.log(`   ✓ 生成 ${pageElementsPath}`);
}
