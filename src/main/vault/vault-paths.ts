import { join } from "node:path";

/**
 * 保险库目录的名称, 位于用户数据目录之下, 与偏好文件分开.
 */
const VAULT_DIRECTORY_NAME = "vault";

/**
 * 加密数据库文件的名称.
 */
const DATABASE_FILE_NAME = "vault.db";

/**
 * 密钥文件的名称, 里面是被保护的数据密钥.
 */
const KEY_FILE_NAME = "vault-key.json";

/**
 * 保险库在磁盘上的位置.
 */
export interface VaultPaths {
  /**
   * 保险库目录.
   */
  readonly directory: string;
  /**
   * 加密数据库文件.
   */
  readonly databaseFile: string;
  /**
   * 密钥文件.
   */
  readonly keyFile: string;
}

/**
 * 按用户数据目录计算保险库的各个路径.
 * @param userDataDirectory 应用的用户数据目录.
 * @returns 保险库路径.
 */
export function resolveVaultPaths(userDataDirectory: string): VaultPaths {
  const directory = join(userDataDirectory, VAULT_DIRECTORY_NAME);
  return {
    directory,
    databaseFile: join(directory, DATABASE_FILE_NAME),
    keyFile: join(directory, KEY_FILE_NAME),
  };
}
