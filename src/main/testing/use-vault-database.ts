import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { afterEach, beforeEach } from "vitest";

import {
  openVaultDatabase,
  type VaultDatabase,
} from "../vault/database/open-vault-database";
import { MIGRATIONS_FOLDER } from "./migrations-folder";
import { useTemporaryDirectory } from "./temporary-directory";

/**
 * 在当前测试分组中登记钩子: 每个测试前在临时目录里打开一个迁移到最新结构的加密数据库, 测试后
 * 关闭.
 * @param directoryName 临时目录的名称前缀.
 * @returns 取当前测试数据库的函数.
 */
export function useVaultDatabase(directoryName: string): () => VaultDatabase {
  const getDirectory = useTemporaryDirectory(directoryName);
  let database: VaultDatabase;
  beforeEach(() => {
    database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  });
  afterEach(() => {
    database.close();
  });
  return () => database;
}
