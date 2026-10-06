import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTRY,
  MAX_ENTRY_ATTACHMENT_BYTES,
} from "@shared/attachments/attachment-limits";
import {
  restoreProblem,
  type RestoreProblem,
  type RestoreProblemCode,
} from "@shared/restore/restore-problem";

import type {
  NativeAttachmentDocument,
  NativeEntryDocument,
} from "../export/serializers/native/native-format-types";
import {
  isNativeAttachmentId,
  nativeAttachmentPath,
} from "../export/serializers/native/native-format-version";
import type { RestoreVaultDocument } from "./restore-backup-types";
import { findDuplicatePosition } from "./restore-duplicate-finder";

/**
 * 一个声明的附件, 带它在全部附件里的序号 (从 1 起).
 */
interface DeclaredAttachment {
  /**
   * 附件声明.
   */
  readonly attachment: NativeAttachmentDocument;
  /**
   * 附件在全部附件里的序号, 从 1 起.
   */
  readonly position: number;
}

/**
 * 判断一个附件声明自身是否合规: 编号能用作文件名, 名称非空, 大小在 1 字节到单个附件上限之间,
 * 路径与编号对应.
 * @param attachment 附件声明.
 * @returns 合规时为 true.
 */
function isAttachmentValid(attachment: NativeAttachmentDocument): boolean {
  return (
    isNativeAttachmentId(attachment.id) &&
    attachment.name.length > 0 &&
    attachment.size >= 1 &&
    attachment.size <= MAX_ATTACHMENT_BYTES &&
    attachment.path === nativeAttachmentPath(attachment.id)
  );
}

/**
 * 判断一个条目的附件作为整体是否合规: 个数与总字节数不超过每条目上限, 顺序号互不重复.
 * @param entry 条目.
 * @returns 合规时为 true.
 */
function isEntryAttachmentSetValid(entry: NativeEntryDocument): boolean {
  const totalBytes = entry.attachments.reduce(
    (total, attachment) => total + attachment.size,
    0,
  );
  return (
    entry.attachments.length <= MAX_ATTACHMENTS_PER_ENTRY &&
    totalBytes <= MAX_ENTRY_ATTACHMENT_BYTES &&
    findDuplicatePosition(
      entry.attachments.map((attachment) => String(attachment.position)),
    ) === undefined
  );
}

/**
 * 按条目顺序列出全部声明的附件, 带全局序号.
 * @param document 备份里的保险库数据.
 * @returns 全部声明的附件.
 */
function listDeclaredAttachments(
  document: RestoreVaultDocument,
): DeclaredAttachment[] {
  return document.entries
    .flatMap((entry) => entry.attachments)
    .map((attachment, index) => ({ attachment, position: index + 1 }));
}

/**
 * 校验附件声明本身: 每个条目的附件整体合规, 每个附件合规, 编号全局互不重复.
 * @param document 备份里的保险库数据.
 * @param declared 全部声明的附件.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
function validateDeclarations(
  document: RestoreVaultDocument,
  declared: readonly DeclaredAttachment[],
): RestoreProblem | undefined {
  const duplicateId = findDuplicatePosition(
    declared.map((item) => item.attachment.id),
  );
  if (duplicateId !== undefined) {
    return restoreProblem("attachments", "duplicate-id", duplicateId);
  }
  const invalid = declared.find((item) => !isAttachmentValid(item.attachment));
  if (invalid !== undefined) {
    return restoreProblem("attachments", "invalid-value", invalid.position);
  }
  const hasBadSet = document.entries.some(
    (entry) => !isEntryAttachmentSetValid(entry),
  );
  return hasBadSet ? restoreProblem("attachments", "invalid-value") : undefined;
}

/**
 * 声明的附件与压缩包里附件内容对不上的地方.
 */
interface ContentMismatch {
  /**
   * 问题的原因代码.
   */
  readonly code: RestoreProblemCode;
  /**
   * 对不上的附件在全部附件里的序号, 从 1 起.
   */
  readonly position: number;
}

/**
 * 找出声明的附件与压缩包里附件内容对不上的第一个地方: 缺内容, 字节数与声明不符.
 * @param declared 全部声明的附件.
 * @param contents 压缩包里的附件内容.
 * @returns 问题的原因代码与序号, 都对得上时为 undefined.
 */
function findContentMismatch(
  declared: readonly DeclaredAttachment[],
  contents: ReadonlyMap<string, Buffer>,
): ContentMismatch | undefined {
  for (const { attachment, position } of declared) {
    const content = contents.get(attachment.id);
    if (content === undefined) {
      return { code: "missing-file", position };
    }
    if (content.length !== attachment.size) {
      return { code: "size-mismatch", position };
    }
  }
  return undefined;
}

/**
 * 校验条目的附件: 声明本身合规, 声明的每个附件在压缩包里都有大小一致的内容, 压缩包里没有声明之外
 * 的附件内容.
 * @param document 备份里的保险库数据.
 * @param contents 压缩包里的附件内容, 键是附件编号.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
export function validateAttachments(
  document: RestoreVaultDocument,
  contents: ReadonlyMap<string, Buffer>,
): RestoreProblem | undefined {
  const declared = listDeclaredAttachments(document);
  const declarationProblem = validateDeclarations(document, declared);
  if (declarationProblem !== undefined) {
    return declarationProblem;
  }
  const mismatch = findContentMismatch(declared, contents);
  if (mismatch !== undefined) {
    return restoreProblem("attachments", mismatch.code, mismatch.position);
  }
  const declaredIds = new Set(declared.map((item) => item.attachment.id));
  const hasUndeclared = Array.from(contents.keys()).some(
    (id) => !declaredIds.has(id),
  );
  return hasUndeclared
    ? restoreProblem("archive", "unexpected-file")
    : undefined;
}
