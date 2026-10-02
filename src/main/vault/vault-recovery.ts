import { isMasterPasswordLongEnough } from "@shared/vault/master-password-policy";
import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultOperationFailure,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";

import type { KeyProtectionWriter } from "./key-protection-writer";
import { recoverDataKey, type DataKeyRecovery } from "./recover-data-key";

/**
 * 恢复时给数据密钥换上新保护的步骤: 成功返回 undefined, 失败返回失败结果.
 */
type RecoveryProtection = (
  dataKey: Buffer,
) => Promise<VaultOperationFailure | undefined>;

/**
 * 恢复需要的密钥保护写入能力, 取自密钥保护写入器.
 */
export type RecoveryKeyProtection = Pick<
  KeyProtectionWriter,
  "writeMasterPasswordProtection" | "writeSystemProtection"
>;

/**
 * 保险库恢复的依赖.
 */
export interface VaultRecoveryDependencies {
  /**
   * 现有的加密数据库文件, 找回的数据密钥必须能打开它.
   */
  readonly databaseFile: string;
  /**
   * 给找回的数据密钥换上新保护的写入器.
   */
  readonly keyProtection: RecoveryKeyProtection;
}

/**
 * 保险库恢复: 凭恢复词找回数据密钥, 并给它换上新保护. 只负责这两步, 不持有状态, 不打开
 * 数据库; 成功时把数据密钥交给调用方, 由调用方打开数据库并清零, 失败时已清零.
 */
export class VaultRecovery {
  /**
   * 创建保险库恢复.
   * @param dependencies 恢复依赖.
   */
  constructor(private readonly dependencies: VaultRecoveryDependencies) {}

  /**
   * 校验恢复词: 词数, 词表, 校验和都对, 且现有数据库能被它打开才算通过. 不改动任何文件.
   * @param words 用户输入的恢复词.
   * @returns 校验结果.
   */
  async verifyWords(words: readonly string[]): Promise<VaultOperationResult> {
    const recovery = await recoverDataKey(
      words,
      this.dependencies.databaseFile,
    );
    if (!recovery.ok) {
      return recovery;
    }
    recovery.dataKey.fill(0);
    return VAULT_OPERATION_SUCCEEDED;
  }

  /**
   * 凭恢复词找回数据密钥, 并用新主密码保护它, 重新写入密钥文件.
   * @param words 用户输入的恢复词.
   * @param masterPassword 新主密码.
   * @returns 成功时带数据密钥, 调用方用完后必须清零; 失败时带原因, 密钥文件不变.
   */
  recoverWithMasterPassword(
    words: readonly string[],
    masterPassword: string,
  ): Promise<DataKeyRecovery> {
    return this.recoverAndProtect(words, async (dataKey) => {
      if (!isMasterPasswordLongEnough(masterPassword)) {
        return vaultOperationFailed("password-too-short");
      }
      await this.dependencies.keyProtection.writeMasterPasswordProtection(
        dataKey,
        masterPassword,
      );
      return undefined;
    });
  }

  /**
   * 凭恢复词找回数据密钥, 并改用系统保护它, 重新写入密钥文件.
   * @param words 用户输入的恢复词.
   * @returns 成功时带数据密钥, 调用方用完后必须清零; 失败时带原因, 密钥文件不变.
   */
  recoverWithSystemProtection(
    words: readonly string[],
  ): Promise<DataKeyRecovery> {
    return this.recoverAndProtect(words, async (dataKey) =>
      (await this.dependencies.keyProtection.writeSystemProtection(dataKey))
        ? undefined
        : vaultOperationFailed("system-protection-unavailable"),
    );
  }

  /**
   * 找回数据密钥并给它换上新保护. 新保护写入失败时不改动已有的密钥文件.
   * @param words 用户输入的恢复词.
   * @param protect 给数据密钥换上新保护的步骤.
   * @returns 成功时带数据密钥, 失败时带原因.
   */
  private async recoverAndProtect(
    words: readonly string[],
    protect: RecoveryProtection,
  ): Promise<DataKeyRecovery> {
    const recovery = await recoverDataKey(
      words,
      this.dependencies.databaseFile,
    );
    if (!recovery.ok) {
      return recovery;
    }
    return this.protectRecoveredKey(recovery.dataKey, protect);
  }

  /**
   * 给找回的数据密钥换上新保护. 保护失败或抛错时清零内存里的数据密钥.
   * @param dataKey 已确认能打开数据库的数据密钥.
   * @param protect 给数据密钥换上新保护的步骤.
   * @returns 成功时带数据密钥, 失败时带原因.
   */
  private async protectRecoveredKey(
    dataKey: Buffer,
    protect: RecoveryProtection,
  ): Promise<DataKeyRecovery> {
    let failure: VaultOperationFailure | undefined;
    try {
      failure = await protect(dataKey);
    } catch (error) {
      dataKey.fill(0);
      throw error;
    }
    if (failure !== undefined) {
      dataKey.fill(0);
      return failure;
    }
    return { ok: true, dataKey };
  }
}
