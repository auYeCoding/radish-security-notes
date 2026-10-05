import { isExportFormatKey } from "@shared/export/export-format-keys";
import {
  EXPORT_SECRET_MAX_LENGTH,
  MAX_EXPORT_ENTRY_ID_LENGTH,
  MAX_EXPORT_SCOPE_IDS,
} from "@shared/export/export-limits";
import type { ExportRequest, ExportScope } from "@shared/export/export-request";

/**
 * 导出参数不合规时的错误信息.
 */
const INVALID_EXPORT_ARGUMENT_MESSAGE = "无效的导出参数";

/**
 * 判断一个值是否是普通对象.
 * @param value 待判断的值.
 * @returns 是非 null 的对象时返回 true.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 判断一个值是否是长度合规的非空条目编号.
 * @param value 待判断的值.
 * @returns 是时返回 true.
 */
function isEntryId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_EXPORT_ENTRY_ID_LENGTH
  );
}

/**
 * 判断一个值是否是没给, 或长度不超过上限的字符串, 口令与主密码用.
 * @param value 待判断的值.
 * @returns 合规时返回 true.
 */
function isOptionalSecret(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === "string" && value.length <= EXPORT_SECRET_MAX_LENGTH)
  );
}

/**
 * 校验渲染进程传来的范围: 全部条目, 或条目编号列表, 编号个数与长度都有上限. 多余的键被丢弃.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的范围.
 * @throws Error 当参数不是合规的范围时.
 */
export function requireExportScope(value: unknown): ExportScope {
  if (isRecord(value) && value["kind"] === "all") {
    return { kind: "all" };
  }
  if (
    isRecord(value) &&
    value["kind"] === "entries" &&
    Array.isArray(value["entryIds"]) &&
    value["entryIds"].length <= MAX_EXPORT_SCOPE_IDS &&
    value["entryIds"].every(isEntryId)
  ) {
    return { kind: "entries", entryIds: [...value["entryIds"]] };
  }
  throw new Error(INVALID_EXPORT_ARGUMENT_MESSAGE);
}

/**
 * 校验渲染进程传来的导出请求: 格式是登记过的格式, 三个标志是布尔值, 口令与主密码是没给或长度
 * 不超过上限的字符串, 范围合规. 多余的键被丢弃. 口令是否够长, 主密码对不对由服务判断.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的请求.
 * @throws Error 当参数不是合规的请求时.
 */
export function requireExportRequest(value: unknown): ExportRequest {
  if (
    !isRecord(value) ||
    !isExportFormatKey(value["format"]) ||
    typeof value["includeSecrets"] !== "boolean" ||
    typeof value["includeAttachments"] !== "boolean" ||
    typeof value["hasAcknowledgedPlaintextRisk"] !== "boolean" ||
    !isOptionalSecret(value["passphrase"]) ||
    !isOptionalSecret(value["masterPassword"])
  ) {
    throw new Error(INVALID_EXPORT_ARGUMENT_MESSAGE);
  }
  return {
    format: value["format"],
    includeSecrets: value["includeSecrets"],
    includeAttachments: value["includeAttachments"],
    hasAcknowledgedPlaintextRisk: value["hasAcknowledgedPlaintextRisk"],
    scope: requireExportScope(value["scope"]),
    ...(value["passphrase"] === undefined
      ? {}
      : { passphrase: value["passphrase"] }),
    ...(value["masterPassword"] === undefined
      ? {}
      : { masterPassword: value["masterPassword"] }),
  };
}
