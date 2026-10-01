import { adaptToDrizzle, type VaultOrm } from "./drizzle-adapter";
import { openEncryptedDatabase } from "./open-encrypted-database";

/**
 * 打开保险库数据库需要的信息.
 */
export interface OpenVaultDatabaseOptions {
  /**
   * 数据库文件路径.
   */
  readonly databaseFile: string;
  /**
   * 32 字节的数据密钥.
   */
  readonly dataKey: Buffer;
  /**
   * 迁移文件夹路径.
   */
  readonly migrationsFolder: string;
}

/**
 * 已解锁并迁移到最新结构的保险库数据库.
 */
export interface VaultDatabase {
  /**
   * drizzle 的查询入口.
   */
  readonly orm: VaultOrm;
  /**
   * 关闭数据库连接.
   */
  readonly close: () => void;
}

/**
 * 打开保险库数据库: 用数据密钥解锁整库加密的文件, 再执行迁移.
 * @param options 数据库文件, 数据密钥与迁移文件夹.
 * @returns 已解锁并迁移完成的数据库.
 * @throws DatabaseKeyRejectedError 当数据库拒绝数据密钥时.
 */
export function openVaultDatabase(
  options: OpenVaultDatabaseOptions,
): VaultDatabase {
  const client = openEncryptedDatabase(options.databaseFile, options.dataKey);
  try {
    const { orm, applyMigrations } = adaptToDrizzle(client);
    applyMigrations(options.migrationsFolder);
    return { orm, close: () => client.close() };
  } catch (error) {
    client.close();
    throw error;
  }
}
