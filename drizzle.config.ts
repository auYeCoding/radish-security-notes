import { defineConfig } from "drizzle-kit";

/**
 * 表结构定义文件的通配, 每张表一个 `*-schema.ts`, drizzle-kit 据此生成迁移.
 */
const SCHEMA_FILES = "./src/main/vault/database/*-schema.ts";

/**
 * 迁移文件的输出目录. 放在 resources 下, 打包时随 `resources/**` 进入 asar.
 */
const MIGRATIONS_DIRECTORY = "./resources/migrations";

/**
 * drizzle-kit 配置: 只用于 `drizzle-kit generate` 生成迁移, 不连接数据库.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: SCHEMA_FILES,
  out: MIGRATIONS_DIRECTORY,
});
