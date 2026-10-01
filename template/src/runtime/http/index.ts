/**
 * 应用 HTTP 运行时公共入口。
 *
 * 通用请求、签名、序列化和错误内核由 @g2rain/http 提供；这里仅暴露
 * 本应用的 Client 注册表、IAM 适配和刷新协调能力。
 */
export * from './registry';
export { refreshBarrier } from './refresh-barrier';
export { mockManager, MockManager } from './mock-data';
export type { MockData, MockDataFunction, MockDataMap } from './mock-data';
