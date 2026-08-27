# 完成定义

- [ ] Requirements 的目标、非目标、验收条件和 CLI/模板影响明确。
- [ ] 项目名、Context Path、模板路径和参数经过同一套明确校验。
- [ ] 不覆盖已有目录，不允许目标路径逃逸或 shell 注入。
- [ ] 模板来源/版本、排除项、占位符和生成项目 Profile 兼容性已检查。
- [ ] 交互、非交互、取消、错误和非 TTY 行为已评估。
- [ ] 失败不会误报成功；半成品处理和恢复方式明确。
- [ ] `npm run build` 通过，dist shebang/bin 正确。
- [ ] 在临时目录完成本地模板 smoke test，无仓库污染。
- [ ] 生成项目的 package name、Context Path、排除项和残留占位符已检查。
- [ ] 发布变化已运行 `npm pack --dry-run`，包内容与版本正确。
- [ ] README、docs/project.yaml、中央契约和模板文档已同步。
- [ ] Git Diff 无 Secret、构建产物、临时项目和无关锁文件变化。
- [ ] 已知偏差已更新，跨项目规则变化已同步中央 Profile。
