import { resolve } from "node:path";

/**
 * 项目中的迁移文件夹, 测试用它打开数据库.
 */
export const MIGRATIONS_FOLDER = resolve(
  import.meta.dirname,
  "../../../resources/migrations",
);
