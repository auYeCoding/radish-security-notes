import type { ZodError } from "zod";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
import {
  createNewEntrySchema,
  type NewEntryFormValues,
} from "@shared/entries/new-entry-schema";
import { findEntryType } from "@shared/entries/preset-entry-types";
import type { NotImportedItem } from "@shared/import/import-reasons";
import type { ImportSourceKey } from "@shared/import/import-source-keys";

import { cleanDraft } from "./import-draft-cleaner";
import { duplicateKeyOf } from "./import-duplicate-key";
import { normalizeFolderPath } from "./import-folder-path";
import type { ChunkObserver } from "./import-progress";
import { normalizeTagNames } from "./import-tag-names";
import type {
  ImportedEntryDraft,
  SourceLoss,
  SourceParseOutput,
} from "./source-adapter";

/**
 * 校验通过, 等待写库的一个条目.
 */
export interface PlannedEntry {
  /**
   * 条目的类型键.
   */
  readonly typeKey: string;
  /**
   * 经新建校验方案校验后的取值, 不含所属文件夹与标签.
   */
  readonly values: NewEntryFormValues;
  /**
   * 所属文件夹的名称, 未分类时为 undefined.
   */
  readonly folderName: string | undefined;
  /**
   * 带的标签名.
   */
  readonly tagNames: readonly string[];
  /**
   * 判重键.
   */
  readonly duplicateKey: string;
}

/**
 * 一次导入的规划结果.
 */
export interface ImportPlan {
  /**
   * 来源的格式.
   */
  readonly sourceKey: ImportSourceKey;
  /**
   * 来源文件里的条目总数, 含整条跳过的条目.
   */
  readonly totalEntryCount: number;
  /**
   * 校验通过, 能写库的条目, 按来源里的顺序排列.
   */
  readonly entries: readonly PlannedEntry[];
  /**
   * 整条跳过的条目个数: 类型不支持或校验不通过.
   */
  readonly skippedEntryCount: number;
  /**
   * 未能带入清单, 只含名称, 字段名称与原因代码.
   */
  readonly notImported: readonly NotImportedItem[];
}

/**
 * 一个草稿的规划结果: 能写库的条目 (整条跳过时没有), 与它带来的清单项.
 */
interface DraftPlan {
  /**
   * 能写库的条目, 整条跳过时为 undefined.
   */
  readonly entry: PlannedEntry | undefined;
  /**
   * 这个草稿带来的清单项.
   */
  readonly items: readonly NotImportedItem[];
  /**
   * 因超过字符上限被截断的文件夹名称, 没有被截断时为 undefined.
   */
  readonly truncatedFolder: string | undefined;
}

/**
 * 把来源里的损失转成某个条目的清单项.
 * @param name 条目名称.
 * @param losses 损失列表.
 * @returns 清单项.
 */
function toEntryItems(
  name: string,
  losses: readonly SourceLoss[],
): NotImportedItem[] {
  return losses.map((loss) => ({
    scope: "entry",
    name,
    fieldName: loss.fieldName,
    reason: loss.reason,
  }));
}

/**
 * 把校验失败归成整条跳过的清单项: 名称的问题是名称无效, 类型字段的问题是字段超长.
 * @param name 条目名称.
 * @param error 校验错误.
 * @returns 清单项.
 */
function toRejectionItem(name: string, error: ZodError): NotImportedItem {
  const [section, fieldKey] = error.issues[0]?.path ?? [];
  if (section === "fields" && typeof fieldKey === "string") {
    return {
      scope: "entry",
      name,
      fieldName: fieldKey,
      reason: "field-too-long",
    };
  }
  return { scope: "entry", name, reason: "name-invalid" };
}

/**
 * 按类型补全类型字段的取值: 类型的每个字段都有一项, 草稿没给的取空串.
 * @param type 条目类型定义.
 * @param fields 草稿的类型字段取值.
 * @returns 补全后的取值.
 */
function completeFields(
  type: EntryTypeDefinition,
  fields: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    type.fields.map((field) => [field.key, fields[field.key] ?? ""]),
  );
}

/**
 * 规划一个草稿: 找类型, 处理局部问题, 校验. 类型不支持或校验不通过时整条跳过.
 * @param draft 适配器输出的草稿.
 * @returns 规划结果.
 */
function planDraft(draft: ImportedEntryDraft): DraftPlan {
  const displayName = draft.name.trim();
  const type =
    draft.typeKey === undefined ? undefined : findEntryType(draft.typeKey);
  if (type === undefined) {
    const item: NotImportedItem = {
      scope: "entry",
      name: displayName,
      reason: "type-unsupported",
    };
    return { entry: undefined, items: [item], truncatedFolder: undefined };
  }
  const cleaned = cleanDraft(draft);
  const parsed = createNewEntrySchema(type).safeParse({
    name: draft.name,
    fields: completeFields(type, draft.fields),
    notes: draft.notes,
    notesFormat: "plain",
    customFields: cleaned.customFields,
    totp: cleaned.totp,
  });
  if (!parsed.success) {
    const item = toRejectionItem(displayName, parsed.error);
    return { entry: undefined, items: [item], truncatedFolder: undefined };
  }
  const folder = normalizeFolderPath(draft.folderPath);
  const tags = normalizeTagNames(draft.tagNames);
  const name = parsed.data.name;
  return {
    entry: {
      typeKey: type.key,
      values: parsed.data,
      folderName: folder.name,
      tagNames: tags.tagNames,
      duplicateKey: duplicateKeyOf(name, parsed.data.fields),
    },
    items: toEntryItems(name, [
      ...draft.losses,
      ...cleaned.losses,
      ...tags.losses,
    ]),
    truncatedFolder: folder.isTruncated ? folder.name : undefined,
  };
}

/**
 * 规划整次导入: 逐个草稿做类型映射, 局部问题处理与新建校验 (沿用新建条目的校验规则), 汇总清单.
 * 每处理一个草稿报告一次进度, 每块让出一次事件循环. 因路径过长被截断的文件夹在清单里只列一次.
 * @param sourceKey 来源的格式.
 * @param output 适配器的输出.
 * @param observer 分块观察者.
 * @returns 规划结果.
 */
export async function planImport(
  sourceKey: ImportSourceKey,
  output: SourceParseOutput,
  observer: ChunkObserver,
): Promise<ImportPlan> {
  const entries: PlannedEntry[] = [];
  const notImported: NotImportedItem[] = [...output.notImported];
  const truncatedFolders = new Set<string>();
  const total = output.drafts.length;
  for (const [index, draft] of output.drafts.entries()) {
    const plan = planDraft(draft);
    if (plan.entry !== undefined) {
      entries.push(plan.entry);
    }
    notImported.push(...plan.items);
    if (plan.truncatedFolder !== undefined) {
      truncatedFolders.add(plan.truncatedFolder);
    }
    await observer.advance(index + 1, total);
  }
  for (const folderName of truncatedFolders) {
    notImported.push({
      scope: "folder",
      name: folderName,
      reason: "folder-name-truncated",
    });
  }
  return {
    sourceKey,
    totalEntryCount: total,
    entries,
    skippedEntryCount: total - entries.length,
    notImported,
  };
}
