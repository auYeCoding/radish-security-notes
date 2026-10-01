import { BetterSQLiteSession } from "drizzle-orm/better-sqlite3/session";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { BaseSQLiteDatabase, SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import type { SqliteClient } from "./open-encrypted-database";

/**
 * drizzle 的同步 SQLite 数据库对象的类型.
 */
export type VaultOrm = BaseSQLiteDatabase<
  "sync",
  unknown,
  Record<string, unknown>
>;

/**
 * 接到 drizzle 上的数据库.
 */
export interface DrizzleDatabase {
  /**
   * drizzle 的查询入口.
   */
  readonly orm: VaultOrm;
  /**
   * 执行迁移文件夹中尚未应用的迁移.
   * @param migrationsFolder 迁移文件夹路径.
   */
  readonly applyMigrations: (migrationsFolder: string) => void;
}

/**
 * 把已解锁的 better-sqlite3-multiple-ciphers 连接接到 drizzle. 不用 drizzle 的
 * `drizzle-orm/better-sqlite3` 入口: 它在加载时就 require `better-sqlite3`, 而本项目
 * 只安装了 `better-sqlite3-multiple-ciphers`. 这里只用 drizzle 公开导出的会话,
 * 方言与迁移读取函数, 组装方式与该入口的 `drizzle()` 一致.
 * @param client 已解锁的连接.
 * @returns drizzle 查询入口与迁移函数.
 */
export function adaptToDrizzle(client: SqliteClient): DrizzleDatabase {
  const dialect = new SQLiteSyncDialect();
  const session = new BetterSQLiteSession(client, dialect, undefined, {});
  const orm = new BaseSQLiteDatabase("sync", dialect, session, undefined);
  return {
    orm,
    applyMigrations: (migrationsFolder) => {
      const migrations = readMigrationFiles({ migrationsFolder });
      dialect.migrate(migrations, session, { migrationsFolder });
    },
  };
}
