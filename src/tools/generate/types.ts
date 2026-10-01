export interface TableColumn {
  name: string;
  camelName: string;
  type: string;
  nullable: boolean;
  comment: string;
  isBaseField: boolean;
  isDeleteFlag: boolean;
}

export interface TableInfo {
  name: string;
  camelName: string;
  routePath: string;
  routeName: string;
  tableComment: string;
  title: string;
  columns: TableColumn[];
  baseColumns: TableColumn[];
  businessColumns: TableColumn[];
}

export interface GeneratePaths {
  cwd: string;
  sqlPath: string;
  viewsDir: string;
  routeMapPath: string;
  templatesDir: string;
}

export interface GenerateOptions {
  view?: boolean;
  api?: boolean;
  mock?: boolean;
  route?: boolean;
}
