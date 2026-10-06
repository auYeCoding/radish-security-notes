import { MAX_ATTACHMENT_BYTES } from "@shared/attachments/attachment-limits";
import type { RestoreLimits } from "@shared/restore/restore-limits";
import { restoreProblem } from "@shared/restore/restore-problem";
import {
  restoreFailed,
  type RestoreFailure,
} from "@shared/restore/restore-result";

import {
  attachmentIdOfPath,
  NATIVE_MANIFEST_PATH,
  NATIVE_VAULT_PATH,
} from "../export/serializers/native/native-format-version";
import { findDuplicatePosition } from "./restore-duplicate-finder";

/**
 * 压缩方法: 仅存储.
 */
const COMPRESSION_METHOD_STORED = 0;

/**
 * 压缩方法: deflate.
 */
const COMPRESSION_METHOD_DEFLATE = 8;

/**
 * 压缩包里一个文件在读取前就能知道的事实, 来自中央目录.
 */
export interface ArchiveEntryFacts {
  /**
   * 文件在压缩包里的路径.
   */
  readonly name: string;
  /**
   * 文件声明的未压缩字节数.
   */
  readonly uncompressedSize: number;
  /**
   * 文件是否加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 文件的压缩方法.
   */
  readonly compressionMethod: number;
}

/**
 * 压缩包里清单或保险库数据文件的角色.
 */
export interface DocumentFileRole {
  /**
   * 角色, 清单或保险库数据.
   */
  readonly kind: "manifest" | "vault";
}

/**
 * 压缩包里附件内容文件的角色.
 */
export interface AttachmentFileRole {
  /**
   * 角色, 附件内容时恒为 attachment.
   */
  readonly kind: "attachment";
  /**
   * 附件编号.
   */
  readonly attachmentId: string;
}

/**
 * 压缩包里一个文件在备份里担任的角色.
 */
export type ArchiveFileRole = DocumentFileRole | AttachmentFileRole;

/**
 * 按路径判断压缩包里的文件是什么. 只认 `manifest.json`, `vault.json` 与 `attachments/<编号>`,
 * 其余路径 (含目录, 路径穿越, 绝对路径, 反斜杠, 嵌套) 一律不认.
 * @param name 文件在压缩包里的路径.
 * @returns 文件的角色, 不认识的路径为 undefined.
 */
export function classifyArchiveEntryName(
  name: string,
): ArchiveFileRole | undefined {
  if (name === NATIVE_MANIFEST_PATH) {
    return { kind: "manifest" };
  }
  if (name === NATIVE_VAULT_PATH) {
    return { kind: "vault" };
  }
  const attachmentId = attachmentIdOfPath(name);
  return attachmentId === undefined
    ? undefined
    : { kind: "attachment", attachmentId };
}

/**
 * 在读任何文件之前检查中央目录声明的文件个数.
 * @param entryCount 压缩包声明的文件个数.
 * @param limits 读取上限.
 * @returns 超过上限时为失败结果, 否则为 undefined.
 */
export function checkArchiveEntryCount(
  entryCount: number,
  limits: RestoreLimits,
): RestoreFailure | undefined {
  return entryCount > limits.maxArchiveFiles
    ? restoreFailed(
        "limit-exceeded",
        restoreProblem("archive", "too-many-files"),
      )
    : undefined;
}

/**
 * 找出某个角色的文件声明的未压缩字节数上限.
 * @param role 文件的角色.
 * @param limits 读取上限.
 * @returns 字节数上限.
 */
function sizeLimitOf(role: ArchiveFileRole, limits: RestoreLimits): number {
  switch (role.kind) {
    case "manifest":
      return limits.maxManifestBytes;
    case "vault":
      return limits.maxVaultDocumentBytes;
    default:
      return MAX_ATTACHMENT_BYTES;
  }
}

/**
 * 检查声明的字节数: 每个文件不超过各自角色的上限, 全部加起来不超过总量上限.
 * @param entries 全部文件.
 * @param limits 读取上限.
 * @returns 第一个超限的失败结果, 都没超限时为 undefined.
 */
function checkDeclaredSizes(
  entries: readonly ArchiveEntryFacts[],
  limits: RestoreLimits,
): RestoreFailure | undefined {
  let total = 0;
  for (const [index, entry] of entries.entries()) {
    const role = classifyArchiveEntryName(entry.name);
    total += entry.uncompressedSize;
    if (
      role === undefined ||
      entry.uncompressedSize > sizeLimitOf(role, limits) ||
      total > limits.maxUncompressedBytes
    ) {
      return restoreFailed(
        "limit-exceeded",
        restoreProblem("archive", "too-large", index + 1),
      );
    }
  }
  return undefined;
}

/**
 * 判断一个文件是否按不支持的方式存放: 加密, 或压缩方法不是仅存储与 deflate.
 * @param entry 文件.
 * @returns 不支持时为 true.
 */
function isUnsupportedStorage(entry: ArchiveEntryFacts): boolean {
  return (
    entry.isEncrypted ||
    (entry.compressionMethod !== COMPRESSION_METHOD_STORED &&
      entry.compressionMethod !== COMPRESSION_METHOD_DEFLATE)
  );
}

/**
 * 检查压缩包里的全部文件, 在读取任何内容之前整体拒绝不合规的压缩包. 按顺序检查: 没有清单就不是
 * 备份文件; 有不认识的路径; 路径重复; 缺保险库数据文件; 加密或压缩方法不支持; 声明的字节数超限.
 * @param entries 全部文件的事实.
 * @param limits 读取上限.
 * @returns 第一个问题对应的失败结果, 没有问题时为 undefined.
 */
export function checkArchiveEntries(
  entries: readonly ArchiveEntryFacts[],
  limits: RestoreLimits,
): RestoreFailure | undefined {
  const names = entries.map((entry) => entry.name);
  if (!names.includes(NATIVE_MANIFEST_PATH)) {
    return restoreFailed("not-a-backup");
  }
  const unknownIndex = names.findIndex(
    (name) => classifyArchiveEntryName(name) === undefined,
  );
  if (unknownIndex >= 0) {
    return restoreFailed(
      "invalid-content",
      restoreProblem("archive", "unexpected-file", unknownIndex + 1),
    );
  }
  const duplicatePosition = findDuplicatePosition(names);
  if (duplicatePosition !== undefined) {
    return restoreFailed(
      "invalid-content",
      restoreProblem("archive", "duplicate-file", duplicatePosition),
    );
  }
  if (!names.includes(NATIVE_VAULT_PATH)) {
    return restoreFailed(
      "invalid-content",
      restoreProblem("archive", "missing-file"),
    );
  }
  if (entries.some(isUnsupportedStorage)) {
    return restoreFailed("damaged-file");
  }
  return checkDeclaredSizes(entries, limits);
}
