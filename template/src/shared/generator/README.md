# Generator 输入说明

本应用已不再在本目录存放生成引擎。SQL 输入位于项目根下的 [`scripts/database.sql`](../../../scripts/database.sql)。

生成命令：

```bash
npm run build:generate -- --tables=<table>
```

引擎由 `create-g2rain-app`（`g2rain-app generate`）提供。
