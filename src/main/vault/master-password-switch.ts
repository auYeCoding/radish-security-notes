import { isMasterPasswordLongEnough } from "@shared/vault/master-password-policy";
import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";

import { KeyUnwrapError } from "./aes-gcm-key-wrapper";
import type { KeyFileStore } from "./key-file-store";
import type { KeyProtectionWriter } from "./key-protection-writer";
import {
  MASTER_PASSWORD_PROTECTION,
  SYSTEM_PROTECTION,
  type KeyRecord,
  type MasterPasswordKeyRecord,
} from "./key-record";
import { unprotectWithMasterPassword } from "./master-password-key-protector";
import {
  createNonFatalOperationGuard,
  type NonFatalOperationGuard,
} from "./non-fatal-operation-guard";
import type { OperationExclusion } from "./operation-exclusion";
import type { SafeStoragePort } from "./safe-storage-port";
import { unprotectWithSystem } from "./system-key-protector";

/**
 * 切换保护方式需要的密钥保护写入能力, 取自密钥保护写入器.
 */
export type MasterPasswordSwitchKeyProtection = Pick<
  KeyProtectionWriter,
  "writeMasterPasswordProtection" | "writeSystemProtection"
>;

/**
 * 主密码切换的依赖.
 */
export interface MasterPasswordSwitchDependencies {
  /**
   * 密钥文件读取, 每次切换都重新读取当前的保护方式.
   */
  readonly keyFileStore: Pick<KeyFileStore, "read">;
  /**
   * 给数据密钥换上新保护的写入器.
   */
  readonly keyProtection: MasterPasswordSwitchKeyProtection;
  /**
   * 开启主密码时解开系统保护的数据密钥用的 safeStorage 接口.
   */
  readonly safeStorage: SafeStoragePort;
  /**
   * 与保险库其它操作共用的互斥标志, 切换期间锁定等其它操作被拒绝.
   */
  readonly exclusion: OperationExclusion;
  /**
   * 保险库当前是否已解锁, 只有已解锁时才允许切换.
   */
  readonly isUnlocked: () => boolean;
  /**
   * 切换意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 主密码开关: 已解锁的保险库在 "系统保护" 与 "主密码保护" 之间切换. 数据密钥不变, 数据库与
 * 附件不重加密, 只把数据密钥重新包裹后原子改写密钥文件, 所以由它编码的恢复词仍然有效. 数据
 * 密钥每次切换重新解出, 用后立即清零. 切换失败不改变保险库状态, 也不改动密钥文件.
 */
export class MasterPasswordSwitch {
  /**
   * 同一时间只允许一个切换, 意外失败不改变保险库状态.
   */
  private readonly guard: NonFatalOperationGuard;

  /**
   * 创建主密码开关.
   * @param dependencies 开关依赖.
   */
  constructor(private readonly dependencies: MasterPasswordSwitchDependencies) {
    this.guard = createNonFatalOperationGuard(
      dependencies.onFailure,
      dependencies.exclusion,
    );
  }

  /**
   * 开启主密码: 把系统保护的数据密钥改用新主密码保护, 当前会话保持解锁.
   * @param masterPassword 新主密码.
   * @returns 切换结果, 失败时密钥文件保持原样.
   */
  enable(masterPassword: string): Promise<VaultOperationResult> {
    return this.guard.run(() => this.runEnable(masterPassword));
  }

  /**
   * 关闭主密码: 校验当前主密码后, 把数据密钥改交系统保护, 下次启动不再要求输入.
   * @param currentPassword 当前主密码.
   * @returns 切换结果, 失败时密钥文件保持原样.
   */
  disable(currentPassword: string): Promise<VaultOperationResult> {
    return this.guard.run(() => this.runDisable(currentPassword));
  }

  /**
   * 执行开启: 状态与新主密码都合格后, 解出数据密钥并用新主密码重新包裹.
   * @param masterPassword 新主密码.
   * @returns 切换结果.
   */
  private async runEnable(
    masterPassword: string,
  ): Promise<VaultOperationResult> {
    const record = await this.readRecordWhenUnlocked();
    if (record?.protection !== SYSTEM_PROTECTION) {
      return vaultOperationFailed("unexpected-state");
    }
    if (!isMasterPasswordLongEnough(masterPassword)) {
      return vaultOperationFailed("password-too-short");
    }
    const { dataKey } = await unprotectWithSystem(
      record,
      this.dependencies.safeStorage,
    );
    try {
      await this.dependencies.keyProtection.writeMasterPasswordProtection(
        dataKey,
        masterPassword,
      );
      return VAULT_OPERATION_SUCCEEDED;
    } finally {
      dataKey.fill(0);
    }
  }

  /**
   * 执行关闭: 用当前主密码解出数据密钥, 再交给系统保护.
   * @param currentPassword 当前主密码.
   * @returns 切换结果.
   */
  private async runDisable(
    currentPassword: string,
  ): Promise<VaultOperationResult> {
    const record = await this.readRecordWhenUnlocked();
    if (record?.protection !== MASTER_PASSWORD_PROTECTION) {
      return vaultOperationFailed("unexpected-state");
    }
    const dataKey = await this.unwrapWithPassword(record, currentPassword);
    if (dataKey === undefined) {
      return vaultOperationFailed("wrong-password");
    }
    try {
      return (await this.dependencies.keyProtection.writeSystemProtection(
        dataKey,
      ))
        ? VAULT_OPERATION_SUCCEEDED
        : vaultOperationFailed("system-protection-unavailable");
    } finally {
      dataKey.fill(0);
    }
  }

  /**
   * 读取密钥文件, 保险库没有解锁时不读取.
   * @returns 密钥文件内容, 未解锁或文件不存在时为 undefined.
   */
  private async readRecordWhenUnlocked(): Promise<KeyRecord | undefined> {
    return this.dependencies.isUnlocked()
      ? this.dependencies.keyFileStore.read()
      : undefined;
  }

  /**
   * 用主密码解开数据密钥.
   * @param record 密钥文件中的主密码保护记录.
   * @param password 用户输入的主密码.
   * @returns 数据密钥, 主密码不对时为 undefined.
   */
  private async unwrapWithPassword(
    record: MasterPasswordKeyRecord,
    password: string,
  ): Promise<Buffer | undefined> {
    try {
      return await unprotectWithMasterPassword(record, password);
    } catch (error) {
      if (error instanceof KeyUnwrapError) {
        return undefined;
      }
      throw error;
    }
  }
}
