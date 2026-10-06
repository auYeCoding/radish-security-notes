import { EXPORT_SECRET_MAX_LENGTH } from "@shared/export/export-limits";
import type { RestoreRunRequest } from "@shared/restore/restore-types";

import { isOptionalSecret, isRecord, isStringWithin } from "./ipc-input-checks";

/**
 * 恢复参数不合规时的错误信息.
 */
const INVALID_RESTORE_ARGUMENT_MESSAGE = "无效的恢复参数";

/**
 * 校验渲染进程传来的备份口令: 是非空字符串, 长度不超过进程边界的上限. 口令对不对由解密判断.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的口令.
 * @throws Error 当参数不是合规的口令时.
 */
export function requireRestorePassphrase(value: unknown): string {
  if (!isStringWithin(value, EXPORT_SECRET_MAX_LENGTH) || value.length === 0) {
    throw new Error(INVALID_RESTORE_ARGUMENT_MESSAGE);
  }
  return value;
}

/**
 * 校验渲染进程传来的恢复请求: 替换确认是布尔值, 主密码是没给或长度不超过上限的字符串. 多余的键
 * 被丢弃. 主密码对不对, 保险库是否非空由服务判断.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的请求.
 * @throws Error 当参数不是合规的请求时.
 */
export function requireRestoreRunRequest(value: unknown): RestoreRunRequest {
  if (
    !isRecord(value) ||
    typeof value["acknowledgesReplace"] !== "boolean" ||
    !isOptionalSecret(value["masterPassword"])
  ) {
    throw new Error(INVALID_RESTORE_ARGUMENT_MESSAGE);
  }
  return {
    acknowledgesReplace: value["acknowledgesReplace"],
    ...(value["masterPassword"] === undefined
      ? {}
      : { masterPassword: value["masterPassword"] }),
  };
}
