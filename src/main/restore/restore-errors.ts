import {
  restoreProblem,
  type RestoreProblemCode,
  type RestoreProblemSection,
} from "@shared/restore/restore-problem";
import {
  restoreFailed,
  type RestoreFailure,
} from "@shared/restore/restore-result";

/**
 * 口令不对, 解不开加密备份时抛出的错误.
 */
export class WrongPassphraseError extends Error {
  /**
   * 创建错口令错误.
   */
  constructor() {
    super("备份口令不对");
    this.name = "WrongPassphraseError";
  }
}

/**
 * 备份文件损坏, 不是合法的加密文件或压缩包时抛出的错误. 底层错误只作为原因保留, 不进入信息.
 */
export class BackupDamagedError extends Error {
  /**
   * 创建备份损坏错误.
   * @param cause 底层错误.
   */
  constructor(cause: unknown) {
    super("备份文件已损坏", { cause });
    this.name = "BackupDamagedError";
  }
}

/**
 * 备份超过读取上限时抛出的错误.
 */
export class RestoreLimitExceededError extends Error {
  /**
   * 创建超限错误.
   * @param section 超限的区段.
   * @param code 超限的原因代码.
   */
  constructor(
    readonly section: RestoreProblemSection,
    readonly code: RestoreProblemCode,
  ) {
    super("备份超过读取上限");
    this.name = "RestoreLimitExceededError";
  }
}

/**
 * 把读取备份时抛出的已知错误换成失败结果.
 * @param error 抛出的错误.
 * @returns 失败结果; 不是已知错误时为 undefined, 由调用方当作意外失败.
 */
export function failureOfRestoreError(
  error: unknown,
): RestoreFailure | undefined {
  if (error instanceof WrongPassphraseError) {
    return restoreFailed("wrong-passphrase");
  }
  if (error instanceof BackupDamagedError) {
    return restoreFailed("damaged-file");
  }
  if (error instanceof RestoreLimitExceededError) {
    return restoreFailed(
      "limit-exceeded",
      restoreProblem(error.section, error.code),
    );
  }
  return undefined;
}
