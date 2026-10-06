import {
  restoreProblem,
  type RestoreProblem,
} from "@shared/restore/restore-problem";
import {
  restoreFailed,
  restoreSucceeded,
  type RestoreResult,
} from "@shared/restore/restore-result";

import type { NativeManifest } from "../export/serializers/native/native-format-types";
import {
  NATIVE_FORMAT_ID,
  NATIVE_FORMAT_VERSION,
} from "../export/serializers/native/native-format-version";
import { manifestSchema } from "./restore-document-schemas";
import type { RestoreVaultDocument } from "./restore-backup-types";

/**
 * 把清单字节解析成 JSON, 不是合法的 JSON 时返回 undefined.
 * @param bytes 清单文件的字节.
 * @returns 解析出的值, 解析失败时为 undefined.
 */
function parseJson(bytes: Buffer): unknown {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return undefined;
  }
}

/**
 * 判断一个值是否是格式标识与本应用完整格式一致的对象.
 * @param value 解析出的清单值.
 * @returns 是时为 true.
 */
function hasNativeFormatId(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "format" in value &&
    value.format === NATIVE_FORMAT_ID
  );
}

/**
 * 判断清单声明的版本是否比本应用能读取的更新.
 * @param manifest 格式标识已确认的清单对象.
 * @returns 版本是整数且大于当前版本时为 true.
 */
function isNewerVersion(manifest: Record<string, unknown>): boolean {
  const { version } = manifest;
  return (
    typeof version === "number" &&
    Number.isInteger(version) &&
    version > NATIVE_FORMAT_VERSION
  );
}

/**
 * 读出并校验清单: 不是合法的 JSON 或格式标识不符就不是本应用的备份文件; 版本更高提示备份来自
 * 更新版本的应用; 结构, 版本或时间不合规是内容不合规.
 * @param bytes 清单文件的字节.
 * @returns 清单; 失败时为失败结果.
 */
export function parseManifest(bytes: Buffer): RestoreResult<NativeManifest> {
  const json = parseJson(bytes);
  if (!hasNativeFormatId(json)) {
    return restoreFailed("not-a-backup");
  }
  if (isNewerVersion(json)) {
    return restoreFailed("newer-version");
  }
  const parsed = manifestSchema.safeParse(json);
  if (!parsed.success) {
    return restoreFailed(
      "invalid-content",
      restoreProblem("manifest", "wrong-shape"),
    );
  }
  if (Number.isNaN(Date.parse(parsed.data.createdAt))) {
    return restoreFailed(
      "invalid-content",
      restoreProblem("manifest", "invalid-value"),
    );
  }
  return restoreSucceeded(parsed.data);
}

/**
 * 数一数条目声明的附件个数.
 * @param document 保险库数据.
 * @returns 全部条目声明的附件个数.
 */
function countDeclaredAttachments(document: RestoreVaultDocument): number {
  return document.entries.reduce(
    (total, entry) => total + entry.attachments.length,
    0,
  );
}

/**
 * 核对清单里的计数与保险库数据里实际的个数, 能发现被截断或被改动的备份. 清单声明文件不含附件
 * 时, 条目声明的附件个数必须是 0, 否则预览会把有附件的备份说成不含附件.
 * @param manifest 清单.
 * @param document 保险库数据.
 * @returns 第一个不一致的问题, 都一致时为 undefined.
 */
export function checkManifestCounts(
  manifest: NativeManifest,
  document: RestoreVaultDocument,
): RestoreProblem | undefined {
  const { counts } = manifest;
  const declaredAttachments = countDeclaredAttachments(document);
  const isConsistent =
    counts.entries === document.entries.length &&
    counts.folders === document.folders.length &&
    counts.tags === document.tags.length &&
    counts.customEntryTypes === document.customEntryTypes.length &&
    counts.attachments === declaredAttachments;
  if (!isConsistent) {
    return restoreProblem("manifest", "count-mismatch");
  }
  return !manifest.includesAttachments && declaredAttachments > 0
    ? restoreProblem("manifest", "invalid-value")
    : undefined;
}
