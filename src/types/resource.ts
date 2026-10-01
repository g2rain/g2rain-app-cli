export type PageElementStatus = 'VISIBLE' | 'ENABLED' | string;

export interface ResourcePage {
  pageName: string;
  pageCode: string;
  linkPath: string;
}

export interface ResourcePageElement {
  parentId: number | null;
  pageElementName: string;
  pageElementCode: string;
  pageElementType: string;
  pageCode: string | null;
  status?: PageElementStatus;
}

export interface ResourceApiEndpoint {
  id?: number;
  status?: string;
  serviceName: string;
  endpoint?: string;
  routePrefix: string;
  apiName: string;
  method: string;
  path: string;
}

export interface ApplicationResources {
  pages: ResourcePage[];
  pageElements: ResourcePageElement[];
  apiEndpoints: ResourceApiEndpoint[];
}
