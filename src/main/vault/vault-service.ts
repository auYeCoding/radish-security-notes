import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultOperationFailure,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";
import { isMasterPasswordLongEnough } from "@shared/vault/master-password-policy";
import type { VaultSetupResult } from "@shared/vault/vault-setup-result";
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
import { MASTER_PASSWORD_PROTECTION } from "./key-record";
import { KeyProtectionWriter } from "./key-protection-writer";
import { unprotectWithMasterPassword } from "./master-password-key-protector";
import type { DataKeyRecovery } from "./recover-data-key";
import { dataKeyToRecoveryWords } from "./recovery-phrase";
import type { SafeStoragePort } from "./safe-storage-port";
import type { SystemKeyPersistence } from "./system-key-persistence";
import { unprotectWithSystem } from "./system-key-protector";
import { VaultRecovery } from "./vault-recovery";
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
   * 把数据密钥保护起来并写成密钥文件, 设置与恢复共用.
   */
  private readonly keyProtection: KeyProtectionWriter;

  /**
   * 凭恢复词找回数据密钥并换上新保护.
   */
  private readonly recovery: VaultRecovery;

  /**
   * 创建保险库服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: VaultServiceDependencies) {
    this.keyProtection = new KeyProtectionWriter(dependencies);
    this.recovery = new VaultRecovery({
      databaseFile: dependencies.paths.databaseFile,
      keyProtection: this.keyProtection,
    });
  }

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
   * 首次设置主密码: 生成数据密钥, 用主密码保护后写入密钥文件, 再创建加密数据库. 成功时
   * 带回由数据密钥编码的恢复词, 这是主进程唯一一次生成它, 之后不再保存.
   * @param masterPassword 用户设置的主密码.
   * @returns 设置结果.
   */
  setupWithMasterPassword(masterPassword: string): Promise<VaultSetupResult> {
    return this.guard(async () => {
      if (this.status !== "needs-setup") {
        return vaultOperationFailed("unexpected-state");
      }
      if (!isMasterPasswordLongEnough(masterPassword)) {
        return vaultOperationFailed("password-too-short");
      }
      const dataKey = generateDataKey();
      const recoveryWords = dataKeyToRecoveryWords(dataKey);
      await this.keyProtection.writeMasterPasswordProtection(
        dataKey,
        masterPassword,
      );
      this.completeUnlock(dataKey);
      return { ok: true, recoveryWords };
    });
  }

  /**
   * 首次启动时跳过主密码: 生成数据密钥, 交给系统保护, 等系统密钥写入磁盘后写入密钥文件, 再
   * 创建加密数据库. 系统密钥没有落盘就写入, 进程被强制结束后数据密钥会永远解不开, 所以
   * 全新的用户数据目录里这一步最多要等十几秒; 超时按系统不能保护数据密钥处理. 成功时带回
   * 由数据密钥编码的恢复词.
   * @returns 设置结果.
   */
  setupWithoutMasterPassword(): Promise<VaultSetupResult> {
    return this.guard(async () => {
      if (this.status !== "needs-setup") {
        return vaultOperationFailed("unexpected-state");
      }
      const dataKey = generateDataKey();
      const recoveryWords = dataKeyToRecoveryWords(dataKey);
      if (!(await this.keyProtection.writeSystemProtection(dataKey))) {
        dataKey.fill(0);
        return vaultOperationFailed("system-protection-unavailable");
      }
      this.completeUnlock(dataKey);
      return { ok: true, recoveryWords };
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
   * 校验恢复词: 词数, 词表, 校验和都对, 且现有数据库能被它打开才算通过. 不改动文件与状态,
   * 恢复页第一步用它在用户设置新保护之前拒绝抄错的词.
   * @param words 用户输入的恢复词.
   * @returns 校验结果.
   */
  verifyRecoveryWords(words: readonly string[]): Promise<VaultOperationResult> {
    return this.guardRecovery(() => this.recovery.verifyWords(words));
  }

  /**
   * 凭恢复词恢复保险库并设置新主密码: 重新包裹同一个数据密钥并改写密钥文件, 原恢复词仍然有效.
   * @param words 用户输入的恢复词.
   * @param masterPassword 新主密码.
   * @returns 恢复结果, 成功时转入已解锁.
   */
  restoreWithMasterPassword(
    words: readonly string[],
    masterPassword: string,
  ): Promise<VaultOperationResult> {
    return this.restore(() =>
      this.recovery.recoverWithMasterPassword(words, masterPassword),
    );
  }

  /**
   * 凭恢复词恢复保险库并改用系统保护数据密钥, 原恢复词仍然有效.
   * @param words 用户输入的恢复词.
   * @returns 恢复结果, 成功时转入已解锁.
   */
  restoreWithoutMasterPassword(
    words: readonly string[],
  ): Promise<VaultOperationResult> {
    return this.restore(() => this.recovery.recoverWithSystemProtection(words));
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
   * 判断当前状态是否允许凭恢复词恢复: 忘记主密码时是锁定, 密钥文件丢失, 损坏或系统密钥
   * 失效时是失败.
   * @returns 允许时返回 true.
   */
  private canRecover(): boolean {
    return this.status === "locked" || this.status === "failed";
  }

  /**
   * 在允许恢复的状态下执行恢复操作, 其它状态按状态不符拒绝.
   * @param operation 要执行的恢复操作.
   * @returns 操作结果.
   */
  private guardRecovery(
    operation: () => Promise<VaultOperationResult>,
  ): Promise<VaultOperationResult> {
    return this.guard(async () =>
      this.canRecover()
        ? operation()
        : vaultOperationFailed("unexpected-state"),
    );
  }

  /**
   * 凭恢复词恢复保险库: 取回已换上新保护的数据密钥, 再打开数据库.
   * @param recover 找回数据密钥并换上新保护的步骤.
   * @returns 恢复结果, 成功时转入已解锁.
   */
  private restore(
    recover: () => Promise<DataKeyRecovery>,
  ): Promise<VaultOperationResult> {
    return this.guardRecovery(async () => {
      const recovery = await recover();
      return recovery.ok ? this.completeUnlock(recovery.dataKey) : recovery;
    });
  }

  /**
   * 执行一个操作. 同一时间只允许一个操作: 已有操作在执行时直接按状态不符拒绝, 避免两次
   * 设置同时通过状态检查, 后写入的密钥文件盖掉先写入的, 让已创建的数据库永远打不开.
   * 意外失败时转入失败状态, 回调通知并返回失败结果.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private async guard<Result extends VaultOperationResult | VaultSetupResult>(
    operation: () => Promise<Result>,
  ): Promise<Result | VaultOperationFailure> {
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
