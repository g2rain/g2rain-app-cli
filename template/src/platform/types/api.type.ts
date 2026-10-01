/**
 * API 响应类型定义
 */

export interface Result<T = any> {
  requestId: string; // 请求id
  requestTime: string; // 请求时间
  status: number; // 状态, 200成功; 500失败
  errorCode: string; // 错误码
  errorMessage: string; // 错误消息
  data: T;
}

/**
 * 分页数据格式
 * @template T 列表项类型
 */
export interface PageData<T = any> {
  pageNum: number; // 当前页码
  pageSize: number; // 每页大小
  total: number; // 总记录数
  totalPages: number; // 总页数
  records: T[]; // 数据列表
}

/**
 * 基础 VO（View Object）接口
 * 包含所有实体类共有的基础字段
 */
export interface BaseVo {
  // 主键 ID
  id: number;

  // 更新时间，格式：YYYY-MM-DD HH:mm:ss
  updateTime: string;

  // 创建时间，格式：YYYY-MM-DD HH:mm:ss
  createTime: string;

  // 版本号（用于乐观锁）
  version: number;
}


/**
 * 查询列表的基础入参 DTO
 * 主要用于分页、过滤和多字段排序
 *
 * 主要功能：
 * - 支持按主键单个或集合查询
 * - 支持创建时间段和更新时间段的区间过滤
 * - 支持多字段排序, 自动校验排序方向
 */
export interface BaseSelectListDto {
  // 主键，用于精确查询单条记录
  id?: number;

  // 主键集合，用于批量查询
  ids?: number[];

  // 更新时间段 [开始时间, 结束时间]，格式：YYYY-MM-DD HH:mm:ss
  updateTime?: [string, string];

  // 创建时间段 [开始时间, 结束时间]，格式：YYYY-MM-DD HH:mm:ss
  createTime?: [string, string];

  // 排序字段，格式：["column,direction"]，如 ["id,desc", "createTime,asc"]
  sorts?: string[];
}

/**
 * 分页查询参数的基础类
 *
 * 该类用于支持分页查询功能，包含页码、页面大小。
 *
 * 主要功能：
 * - 提供当前页码和每页条数的属性
 */
export interface PageSelectListDto {
  // 当前页码，最小页码为1
  pageNum?: number;

  // 每页条数
  pageSize?: number;
}

