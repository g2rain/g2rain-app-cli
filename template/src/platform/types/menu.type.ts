/**
 * 主应用 / Mock 菜单项结构（供 HTTP Mock、类型引用）
 * 与主应用菜单 JSON 保持字段兼容即可。
 */
export interface MenuItem {
  key: string;
  title: string;
  type: 'main' | 'group' | 'sub';
  routePath?: string;
  name?: string;
  activeRule?: string;
  entry?: string;
  children?: MenuItem[];
}
