/** 项目名：同时用作目录名、npm 包名与模板占位符，只允许小写字母、数字和连字符。 */
const PROJECT_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Context Path 单段：小写字母、数字、下划线和连字符。 */
const CONTEXT_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/;

export function validateProjectName(input: string): string {
  if (!PROJECT_NAME.test(input)) {
    throw new Error(
      `Invalid project name: "${input}". Use lowercase letters, digits and hyphens, starting with a letter or digit (e.g. g2rain-order-app).`,
    );
  }
  return input;
}

/** 去掉首尾 `/` 后逐段校验，返回以 `/` 连接的路径（不含首尾 `/`）。 */
export function normalizeContextPath(input: string): string {
  const normalized = input.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    throw new Error('Context path cannot be empty');
  }
  if (!normalized.split('/').every((segment) => CONTEXT_SEGMENT.test(segment))) {
    throw new Error(
      `Invalid context path: "${input}". Use "/"-separated segments of lowercase letters, digits, "_" and "-", each starting with a letter or digit (e.g. order or admin/order).`,
    );
  }
  return normalized;
}
