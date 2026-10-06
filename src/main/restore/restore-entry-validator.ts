import {
  createEntryTypeCatalog,
  type EntryTypeCatalog,
} from "@shared/entries/custom-types/entry-type-catalog";
import { customFieldInputSchema } from "@shared/entries/custom-field-schema";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
import { createEntryContentShape } from "@shared/entries/new-entry-schema";
import { parseTotpInput } from "@shared/entries/totp-input-parser";
import {
  isTotpPeriodSeconds,
  type TotpConfig,
} from "@shared/entries/totp-config";
import {
  restoreProblem,
  type RestoreProblem,
  type RestoreProblemCode,
} from "@shared/restore/restore-problem";
import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";
import { isWithinLength } from "@shared/text/is-within-length";

import type { NativeEntryDocument } from "../export/serializers/native/native-format-types";
import type { RestoreVaultDocument } from "./restore-backup-types";
import { findDuplicatePosition } from "./restore-duplicate-finder";

/**
 * 校验一个条目时用到的备份里的上下文: 类型目录与文件夹, 标签的编号.
 */
interface EntryContext {
  /**
   * 预设类型加备份里的自定义类型组成的类型目录.
   */
  readonly catalog: EntryTypeCatalog;
  /**
   * 备份里文件夹的编号.
   */
  readonly folderIds: ReadonlySet<string>;
  /**
   * 备份里标签的编号.
   */
  readonly tagIds: ReadonlySet<string>;
}

/**
 * 判断名称是否合规且已是规范形式: 校验方案修剪后不改变它, 这样写进库的就是备份里的原值.
 * @param type 条目的类型定义.
 * @param entry 条目.
 * @returns 合规时为 true.
 */
function isNameValid(
  type: EntryTypeDefinition,
  entry: NativeEntryDocument,
): boolean {
  const parsed = createEntryContentShape(type).name.safeParse(entry.name);
  return parsed.success && parsed.data === entry.name;
}

/**
 * 判断类型字段的取值是否合规: 带的键必须是字符串值, 属于类型的字段时不超过字段的长度上限. 条目
 * 可以缺字段 (类型新增字段后旧条目没有它), 也可以带类型之外的过期键, 这与应用自己保存的数据一致,
 * 都原样保留.
 * @param type 条目的类型定义.
 * @param entry 条目.
 * @returns 合规时为 true.
 */
function areFieldsValid(
  type: EntryTypeDefinition,
  entry: NativeEntryDocument,
): boolean {
  return Object.entries(entry.fields).every(([key, value]) => {
    const maxLength = type.fields.find((field) => field.key === key)?.maxLength;
    return maxLength === undefined || isWithinLength(value, maxLength);
  });
}

/**
 * 判断自定义字段是否合规: 字段名已是去首尾空格的非空文本, 条目内编号互不重复.
 * @param entry 条目.
 * @returns 合规时为 true.
 */
function areCustomFieldsValid(entry: NativeEntryDocument): boolean {
  const labelsValid = entry.customFields.every((field) => {
    const parsed = customFieldInputSchema.safeParse(field);
    return parsed.success && parsed.data.label === field.label;
  });
  return (
    labelsValid &&
    findDuplicatePosition(entry.customFields.map((field) => field.id)) ===
      undefined
  );
}

/**
 * 判断 TOTP 配置是否合规: 密钥是规范的大写 Base32 文本, 周期在允许范围内. 算法与位数已在结构校验里
 * 限定.
 * @param totp TOTP 配置.
 * @returns 合规时为 true.
 */
function isTotpValid(totp: TotpConfig): boolean {
  const parsed = parseTotpInput(totp.secret);
  return (
    parsed.ok &&
    parsed.config.secret === totp.secret &&
    isTotpPeriodSeconds(totp.periodSeconds)
  );
}

/**
 * 找出条目内容 (名称, 类型字段, 自定义字段, TOTP) 里第一个不合规的地方.
 * @param type 条目的类型定义.
 * @param entry 条目.
 * @returns 问题的原因代码, 都合规时为 undefined.
 */
function findContentProblem(
  type: EntryTypeDefinition,
  entry: NativeEntryDocument,
): RestoreProblemCode | undefined {
  const isContentValid =
    isNameValid(type, entry) &&
    areFieldsValid(type, entry) &&
    areCustomFieldsValid(entry) &&
    (entry.totp === null || isTotpValid(entry.totp));
  return isContentValid ? undefined : "invalid-value";
}

/**
 * 找出条目对文件夹与标签的引用里第一个不合规的地方: 引用不存在, 标签重复或超过上限.
 * @param entry 条目.
 * @param context 备份里的上下文.
 * @returns 问题的原因代码, 都合规时为 undefined.
 */
function findReferenceProblem(
  entry: NativeEntryDocument,
  context: EntryContext,
): RestoreProblemCode | undefined {
  if (entry.folderId !== null && !context.folderIds.has(entry.folderId)) {
    return "unknown-reference";
  }
  if (entry.tagIds.some((tagId) => !context.tagIds.has(tagId))) {
    return "unknown-reference";
  }
  const hasBadTags =
    entry.tagIds.length > MAX_TAGS_PER_ENTRY ||
    findDuplicatePosition(entry.tagIds) !== undefined;
  return hasBadTags ? "invalid-value" : undefined;
}

/**
 * 找出一个条目第一个不合规的地方.
 * @param entry 条目.
 * @param context 备份里的上下文.
 * @returns 问题的原因代码, 条目合规时为 undefined.
 */
function findEntryProblem(
  entry: NativeEntryDocument,
  context: EntryContext,
): RestoreProblemCode | undefined {
  const type = context.catalog.find(entry.type);
  if (type === undefined) {
    return "unknown-reference";
  }
  return (
    findContentProblem(type, entry) ?? findReferenceProblem(entry, context)
  );
}

/**
 * 校验条目: 编号互不重复, 类型存在 (预设类型或备份里定义的自定义类型), 名称, 类型字段, 自定义
 * 字段与 TOTP 合规, 引用的文件夹与标签都在备份里, 标签不重复且不超过上限. 规则沿用新建条目用的
 * 校验方案. 附件由附件校验器负责.
 * @param document 备份里的保险库数据.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
export function validateEntries(
  document: RestoreVaultDocument,
): RestoreProblem | undefined {
  const duplicateId = findDuplicatePosition(
    document.entries.map((entry) => entry.id),
  );
  if (duplicateId !== undefined) {
    return restoreProblem("entries", "duplicate-id", duplicateId);
  }
  const context: EntryContext = {
    catalog: createEntryTypeCatalog(document.customEntryTypes),
    folderIds: new Set(document.folders.map((folder) => folder.id)),
    tagIds: new Set(document.tags.map((tag) => tag.id)),
  };
  for (const [index, entry] of document.entries.entries()) {
    const code = findEntryProblem(entry, context);
    if (code !== undefined) {
      return restoreProblem("entries", code, index + 1);
    }
  }
  return undefined;
}
