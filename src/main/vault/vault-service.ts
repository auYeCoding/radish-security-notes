import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";
import { isMasterPasswordLongEnough } from "@shared/vault/master-password-policy";
import type { VaultStatus } from "@shared/vault/vault-status";

import { KeyUnwrapError } from "./aes-gcm-key-wrapper";
import type { Argon2Parameters } from "./argon2-parameters";
import { generateDataKey } from "./data-key";
import type { VaultOrm } from "./database/drizzle-adapter";
import {
  openVaultDatabase,
  type VaultDatabase,
} from "./database/open-vault-database";
import { fileExists } from "./file-exists";
import type { KeyFileStore } from "./key-file-store";
import { MASTER_PASSWORD_PROTECTION, type SystemKeyRecord } from "./key-record";
import {
  protectWithMasterPassword,
  unprotectWithMasterPassword,
} from "./master-password-key-protector";
import type { SafeStoragePort } from "./safe-storage-port";
import type { SystemKeyPersistence } from "./system-key-persistence";
import {
  SystemProtectionUnavailableError,
  protectWithSystem,
  unprotectWithSystem,
} from "./system-key-protector";
import type { VaultPaths } from "./vault-paths";

/**
 * 保险库服务的依赖.
 */
export interface VaultServiceDependencies {
  /**
   * 保险库在磁盘上的位置.
   */
  readonly paths: VaultPaths;
  /**
   * 密钥文件存储.
   */
  readonly keyFileStore: KeyFileStore;
  /**
   * 系统保护数据密钥用的 safeStorage 接口.
   */
  readonly safeStorage: SafeStoragePort;
  /**
   * 系统密钥落盘的等待接口, 跳过主密码时要等系统密钥写入磁盘才算设置完成.
   */
  readonly systemKeyPersistence: SystemKeyPersistence;
  /**
   * 迁移文件夹路径.
   */
  readonly migrationsFolder: string;
  /**
   * 新建主密码保护时使用的 Argon2id 成本参数.
   */
  readonly argon2Parameters: Argon2Parameters;
  /**
   * 操作或初始化意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 保险库服务: 判定启动状态, 首次设置主密码或跳过, 解锁, 并持有解锁后的加密数据库.
 * 主密码与数据密钥只在方法执行期间存在于内存, 不写入磁盘或日志.
 */
export class VaultService {
  /**
   * 当前状态, 初始化完成之前视为无法使用.
   */
  private status: VaultStatus = "failed";

  /**
   * 解锁后持有的加密数据库.
   */
  private database: VaultDatabase | undefined;

  /**
   * 是否有设置或解锁操作正在执行.
   */
  private isOperationRunning = false;

  /**
   * 创建保险库服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: VaultServiceDependencies) {}

  /**
   * 判定启动状态: 没有任何文件时需要设置, 主密码保护时等待解锁, 系统保护时直接解锁.
   * @returns 判定完成后兑现.
   */
  async initialize(): Promise<void> {
    try {
      this.status = await this.determineInitialStatus();
    } catch (error) {
      this.status = "failed";
      this.dependencies.onFailure(error);
    }
  }

  /**
   * 读取当前状态.
   * @returns 当前状态.
   */
  getStatus(): VaultStatus {
    return this.status;
  }

  /**
   * 首次设置主密码: 生成数据密钥, 用主密码保护后写入密钥文件, 再创建加密数据库.
   * @param masterPassword 用户设置的主密码.
   * @returns 设置结果.
   */
  setupWithMasterPassword(
    masterPassword: string,
  ): Promise<VaultOperationResult> {
    return this.guard(async () => {
      if (this.status !== "needs-setup") {
        return vaultOperationFailed("unexpected-state");
      }
      if (!isMasterPasswordLongEnough(masterPassword)) {
        return vaultOperationFailed("password-too-short");
      }
      const dataKey = generateDataKey();
      await this.dependencies.keyFileStore.write(
        await protectWithMasterPassword(
          dataKey,
          masterPassword,
          this.dependencies.argon2Parameters,
        ),
      );
      return this.completeUnlock(dataKey);
    });
  }

  /**
   * 首次启动时跳过主密码: 生成数据密钥, 交给系统保护, 等系统密钥写入磁盘后写入密钥文件, 再
   * 创建加密数据库. 系统密钥没有落盘就写入, 进程被强制结束后数据密钥会永远解不开, 所以
   * 全新的用户数据目录里这一步最多要等十几秒; 超时按系统不能保护数据密钥处理.
   * @returns 设置结果.
   */
  setupWithoutMasterPassword(): Promise<VaultOperationResult> {
    return this.guard(async () => {
      if (this.status !== "needs-setup") {
        return vaultOperationFailed("unexpected-state");
      }
      const dataKey = generateDataKey();
      let record: SystemKeyRecord;
      try {
        record = await protectWithSystem(
          dataKey,
          this.dependencies.safeStorage,
        );
      } catch (error) {
        if (error instanceof SystemProtectionUnavailableError) {
          return vaultOperationFailed("system-protection-unavailable");
        }
        throw error;
      }
      const isPersisted =
        await this.dependencies.systemKeyPersistence.waitUntilPersisted();
      if (!isPersisted) {
        return vaultOperationFailed("system-protection-unavailable");
      }
      await this.dependencies.keyFileStore.write(record);
      return this.completeUnlock(dataKey);
    });
  }

  /**
   * 用主密码解锁: 解开数据密钥并打开加密数据库. 主密码不对时状态保持锁定.
   * @param masterPassword 用户输入的主密码.
   * @returns 解锁结果.
   */
  unlock(masterPassword: string): Promise<VaultOperationResult> {
    return this.guard(async () => {
      const record = await this.dependencies.keyFileStore.read();
      if (
        this.status !== "locked" ||
        record?.protection !== MASTER_PASSWORD_PROTECTION
      ) {
        return vaultOperationFailed("unexpected-state");
      }
      try {
        const dataKey = await unprotectWithMasterPassword(
          record,
          masterPassword,
        );
        return this.completeUnlock(dataKey);
      } catch (error) {
        if (error instanceof KeyUnwrapError) {
          return vaultOperationFailed("wrong-password");
        }
        throw error;
      }
    });
  }

  /**
   * 读取已解锁数据库的查询入口, 条目服务经它读写表.
   * @returns 已解锁时是查询入口, 未解锁时为 undefined.
   */
  getOrm(): VaultOrm | undefined {
    return this.database?.orm;
  }

  /**
   * 关闭加密数据库.
   */
  close(): void {
    this.database?.close();
    this.database = undefined;
  }

  /**
   * 按密钥文件判定启动状态, 系统保护时顺带完成解锁.
   * @returns 启动状态.
   */
  private async determineInitialStatus(): Promise<VaultStatus> {
    const record = await this.dependencies.keyFileStore.read();
    if (record === undefined) {
      const hasOrphanDatabase = await fileExists(
        this.dependencies.paths.databaseFile,
      );
      return hasOrphanDatabase ? "failed" : "needs-setup";
    }
    if (record.protection === MASTER_PASSWORD_PROTECTION) {
      return "locked";
    }
    const { dataKey, refreshedRecord } = await unprotectWithSystem(
      record,
      this.dependencies.safeStorage,
    );
    if (refreshedRecord !== undefined) {
      await this.dependencies.keyFileStore.write(refreshedRecord);
    }
    this.openDatabase(dataKey);
    return "unlocked";
  }

  /**
   * 用数据密钥打开数据库并转入已解锁状态.
   * @param dataKey 数据密钥, 打开后清零.
   * @returns 成功的结果.
   */
  private completeUnlock(dataKey: Buffer): VaultOperationResult {
    this.openDatabase(dataKey);
    this.status = "unlocked";
    return VAULT_OPERATION_SUCCEEDED;
  }

  /**
   * 用数据密钥打开加密数据库, 无论成败都清零内存里的数据密钥.
   * @param dataKey 数据密钥.
   */
  private openDatabase(dataKey: Buffer): void {
    try {
      this.database = openVaultDatabase({
        databaseFile: this.dependencies.paths.databaseFile,
        dataKey,
        migrationsFolder: this.dependencies.migrationsFolder,
      });
    } finally {
      dataKey.fill(0);
    }
  }

  /**
   * 执行一个操作. 同一时间只允许一个操作: 已有操作在执行时直接按状态不符拒绝, 避免两次
   * 设置同时通过状态检查, 后写入的密钥文件盖掉先写入的, 让已创建的数据库永远打不开.
   * 意外失败时转入失败状态, 回调通知并返回失败结果.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private async guard(
    operation: () => Promise<VaultOperationResult>,
  ): Promise<VaultOperationResult> {
    if (this.isOperationRunning) {
      return vaultOperationFailed("unexpected-state");
    }
    this.isOperationRunning = true;
    try {
      return await operation();
    } catch (error) {
      this.status = "failed";
      this.dependencies.onFailure(error);
      return vaultOperationFailed("unexpected-error");
    } finally {
      this.isOperationRunning = false;
    }
  }
}
