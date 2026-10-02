import type { Argon2Parameters } from "./argon2-parameters";
import type { KeyFileStore } from "./key-file-store";
import type { SystemKeyRecord } from "./key-record";
import { protectWithMasterPassword } from "./master-password-key-protector";
import type { SafeStoragePort } from "./safe-storage-port";
import type { SystemKeyPersistence } from "./system-key-persistence";
import {
  SystemProtectionUnavailableError,
  protectWithSystem,
} from "./system-key-protector";

/**
 * 密钥保护写入器的依赖.
 */
export interface KeyProtectionWriterDependencies {
  /**
   * 密钥文件存储.
   */
  readonly keyFileStore: KeyFileStore;
  /**
   * 系统保护数据密钥用的 safeStorage 接口.
   */
  readonly safeStorage: SafeStoragePort;
  /**
   * 系统密钥落盘的等待接口.
   */
  readonly systemKeyPersistence: SystemKeyPersistence;
  /**
   * 新建主密码保护时使用的 Argon2id 成本参数.
   */
  readonly argon2Parameters: Argon2Parameters;
}

/**
 * 把数据密钥保护起来并写成密钥文件: 用主密码保护, 或交给系统保护. 首次设置与凭恢复词恢复
 * 共用, 不持有数据密钥, 不改动调用方的缓冲区.
 */
export class KeyProtectionWriter {
  /**
   * 创建密钥保护写入器.
   * @param dependencies 写入器依赖.
   */
  constructor(private readonly dependencies: KeyProtectionWriterDependencies) {}

  /**
   * 用主密码保护数据密钥并写入密钥文件.
   * @param dataKey 要保护的数据密钥.
   * @param masterPassword 主密码.
   * @returns 写入完成后兑现.
   */
  async writeMasterPasswordProtection(
    dataKey: Buffer,
    masterPassword: string,
  ): Promise<void> {
    await this.dependencies.keyFileStore.write(
      await protectWithMasterPassword(
        dataKey,
        masterPassword,
        this.dependencies.argon2Parameters,
      ),
    );
  }

  /**
   * 交给系统保护数据密钥, 等系统密钥写入磁盘后才写入密钥文件. 系统密钥没有落盘就写入,
   * 进程被强制结束后数据密钥会永远解不开.
   * @param dataKey 要保护的数据密钥.
   * @returns 已写入返回 true, 系统不能保护或系统密钥没有落盘返回 false, 此时不写任何文件.
   */
  async writeSystemProtection(dataKey: Buffer): Promise<boolean> {
    const record = await this.protectBySystem(dataKey);
    if (record === undefined) {
      return false;
    }
    if (!(await this.dependencies.systemKeyPersistence.waitUntilPersisted())) {
      return false;
    }
    await this.dependencies.keyFileStore.write(record);
    return true;
  }

  /**
   * 请系统加密数据密钥, 系统不能保护时不抛错.
   * @param dataKey 要保护的数据密钥.
   * @returns 系统保护记录, 系统不能保护时为 undefined.
   */
  private async protectBySystem(
    dataKey: Buffer,
  ): Promise<SystemKeyRecord | undefined> {
    try {
      return await protectWithSystem(dataKey, this.dependencies.safeStorage);
    } catch (error) {
      if (error instanceof SystemProtectionUnavailableError) {
        return undefined;
      }
      throw error;
    }
  }
}
