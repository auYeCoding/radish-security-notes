import { join } from "node:path";

import { app, safeStorage } from "electron";

import { DEFAULT_ARGON2_PARAMETERS } from "../vault/argon2-parameters";
import { KeyFileStore } from "../vault/key-file-store";
import {
  SYSTEM_KEY_PERSISTENCE_POLL_INTERVAL_MILLISECONDS,
  SYSTEM_KEY_PERSISTENCE_TIMEOUT_MILLISECONDS,
  createLocalStatePersistence,
} from "../vault/system-key-persistence";
import { resolveVaultPaths } from "../vault/vault-paths";
import { VaultService } from "../vault/vault-service";

/**
 * 迁移文件夹相对应用目录的路径. 开发时应用目录是项目根目录, 打包后是 asar 根,
 * `resources/**` 在两处都存在.
 */
const MIGRATIONS_FOLDER_SEGMENTS = ["resources", "migrations"];

/**
 * Chromium 保存系统密钥的文件名, 位于用户数据目录下.
 */
const LOCAL_STATE_FILE_NAME = "Local State";

/**
 * 保险库相关的运行时对象.
 */
export interface VaultRuntime {
  /**
   * 保险库服务.
   */
  readonly service: VaultService;
}

/**
 * 把保险库的意外失败写入控制台. 只输出错误名称与信息, 不输出底层原因与任何密钥材料.
 * @param error 底层错误.
 */
function reportVaultFailure(error: unknown): void {
  const description =
    error instanceof Error ? `${error.name}: ${error.message}` : "未知错误";
  console.error(`[保险库] 操作失败, ${description}`);
}

/**
 * 创建保险库运行时对象并判定启动状态. 必须在 app ready 之后调用, 因为 safeStorage
 * 的异步方法要求如此.
 * @returns 保险库运行时对象.
 */
export async function createVaultRuntime(): Promise<VaultRuntime> {
  const userDataDirectory = app.getPath("userData");
  const paths = resolveVaultPaths(userDataDirectory);
  const service = new VaultService({
    paths,
    keyFileStore: new KeyFileStore(paths),
    safeStorage,
    systemKeyPersistence: createLocalStatePersistence({
      localStateFile: join(userDataDirectory, LOCAL_STATE_FILE_NAME),
      timeoutMilliseconds: SYSTEM_KEY_PERSISTENCE_TIMEOUT_MILLISECONDS,
      pollIntervalMilliseconds:
        SYSTEM_KEY_PERSISTENCE_POLL_INTERVAL_MILLISECONDS,
    }),
    migrationsFolder: join(app.getAppPath(), ...MIGRATIONS_FOLDER_SEGMENTS),
    argon2Parameters: DEFAULT_ARGON2_PARAMETERS,
    onFailure: reportVaultFailure,
  });
  await service.initialize();
  return { service };
}
