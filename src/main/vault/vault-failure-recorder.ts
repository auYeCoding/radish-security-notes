import type {
  VaultFailureCause,
  VaultFailureInfo,
  VaultFailureStage,
} from "@shared/vault/vault-failure";

import { DatabaseKeyRejectedError } from "./database/open-encrypted-database";

/**
 * 抛出的值不是 Error 时记下的错误类名.
 */
const UNKNOWN_ERROR_NAME = "UnknownError";

/**
 * 把意外错误归到失败原因: 数据库拒绝了数据密钥 (数据密钥不对或文件已损坏) 是数据库打不开,
 * 其它都是意外失败.
 * @param error 底层错误.
 * @returns 失败原因.
 */
function classifyError(error: unknown): VaultFailureCause {
  return error instanceof DatabaseKeyRejectedError
    ? "database-unreadable"
    : "unexpected";
}

/**
 * 取错误的类名. 只取类名, 不取消息正文: 消息里可能带路径或底层库的细节.
 * @param error 底层错误.
 * @returns 错误类名.
 */
function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : UNKNOWN_ERROR_NAME;
}

/**
 * 失败记录器: 保存保险库当前进入失败状态的原因, 阶段和错误类名, 供失败页说明原因和提交诊断信息.
 * 记录里不含主密码, 数据密钥和错误消息正文.
 */
export class VaultFailureRecorder {
  /**
   * 当前的失败信息, 没有失败时为 undefined.
   */
  private current: VaultFailureInfo | undefined;

  /**
   * 读取当前的失败信息.
   * @returns 失败信息, 没有记录时为 undefined.
   */
  get(): VaultFailureInfo | undefined {
    return this.current;
  }

  /**
   * 记录由文件不一致检测发现的失败, 没有底层错误.
   * @param stage 失败发生的阶段.
   * @param cause 失败原因.
   */
  recordCause(stage: VaultFailureStage, cause: VaultFailureCause): void {
    this.current = { cause, stage, errorName: undefined };
  }

  /**
   * 记录由意外错误引起的失败.
   * @param stage 失败发生的阶段.
   * @param error 底层错误.
   */
  recordError(stage: VaultFailureStage, error: unknown): void {
    this.current = {
      cause: classifyError(error),
      stage,
      errorName: nameOf(error),
    };
  }

  /**
   * 清除记录, 保险库离开失败状态时调用.
   */
  clear(): void {
    this.current = undefined;
  }
}
