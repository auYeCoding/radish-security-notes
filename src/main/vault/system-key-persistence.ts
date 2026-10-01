import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

/**
 * 等待系统密钥落盘的最长时间, 单位毫秒. Chromium 约在应用启动后 10 秒把新生成的系统密钥写进
 * `Local State`, 留出足够余量.
 */
export const SYSTEM_KEY_PERSISTENCE_TIMEOUT_MILLISECONDS = 30000;

/**
 * 检查系统密钥是否已落盘的间隔, 单位毫秒.
 */
export const SYSTEM_KEY_PERSISTENCE_POLL_INTERVAL_MILLISECONDS = 200;

/**
 * 系统密钥落盘的等待接口.
 */
export interface SystemKeyPersistence {
  /**
   * 等待系统密钥写入磁盘. 全新的用户数据目录里, 系统密钥在内存中生成后要过一阵才落盘,
   * 其间进程被强制结束 (崩溃, 断电), 用它加密的数据密钥就永远解不开.
   * @returns 在时限内落盘时兑现为 true, 超时为 false.
   */
  readonly waitUntilPersisted: () => Promise<boolean>;
}

/**
 * 基于 `Local State` 的落盘检查的选项.
 */
export interface LocalStatePersistenceOptions {
  /**
   * Chromium 的 `Local State` 文件路径, 位于用户数据目录下.
   */
  readonly localStateFile: string;
  /**
   * 等待的最长时间, 单位毫秒.
   */
  readonly timeoutMilliseconds: number;
  /**
   * 检查的间隔, 单位毫秒.
   */
  readonly pollIntervalMilliseconds: number;
}

/**
 * `Local State` 里保存系统加密密钥的一节, 字段名由 Chromium 的文件格式决定.
 */
interface LocalStateEncryptionSection {
  /**
   * 被 DPAPI 保护的系统密钥, base64 文本.
   */
  readonly encrypted_key?: unknown;
}

/**
 * `Local State` 文件中本模块关心的部分, 字段名由 Chromium 的文件格式决定.
 */
interface LocalStateContent {
  /**
   * 系统加密相关的一节.
   */
  readonly os_crypt?: LocalStateEncryptionSection;
}

/**
 * 判断 `Local State` 里是否已有系统密钥 (`os_crypt.encrypted_key`). 文件不存在, 还没写完或
 * 内容不是预期结构都视为尚未落盘.
 * @param localStateFile `Local State` 文件路径.
 * @returns 已有非空的系统密钥时为 true.
 */
async function hasSystemKey(localStateFile: string): Promise<boolean> {
  try {
    const state = JSON.parse(
      await readFile(localStateFile, "utf8"),
    ) as LocalStateContent | null;
    const encryptedKey = state?.os_crypt?.encrypted_key;
    return typeof encryptedKey === "string" && encryptedKey.length > 0;
  } catch {
    return false;
  }
}

/**
 * 创建按 `Local State` 判断系统密钥是否落盘的等待器: 按间隔检查, 直到出现或超时.
 * @param options 文件路径, 时限与间隔.
 * @returns 落盘等待器.
 */
export function createLocalStatePersistence(
  options: LocalStatePersistenceOptions,
): SystemKeyPersistence {
  return {
    waitUntilPersisted: async () => {
      const deadline = Date.now() + options.timeoutMilliseconds;
      while (!(await hasSystemKey(options.localStateFile))) {
        if (Date.now() >= deadline) {
          return false;
        }
        await delay(options.pollIntervalMilliseconds);
      }
      return true;
    },
  };
}
