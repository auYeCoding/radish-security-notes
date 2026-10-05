import { requireEntryType } from "@shared/entries/preset-entry-types";
import { foldForComparison } from "@shared/text/is-same-name";

import { buildEntryRecord } from "../entries/entry-record-builder";
import { insertEntry } from "../entries/entry-repository";
import { replaceEntryTags } from "../tags/entry-tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  ensureFolders,
  ensureTags,
  type LabelWriterDependencies,
} from "./import-label-writer";
import type { PlannedEntry } from "./import-planner";

/**
 * 写库用到的依赖.
 */
export type ImportWriterDependencies = LabelWriterDependencies;

/**
 * 写库的结果.
 */
export interface ImportWriteSummary {
  /**
   * 写入的条目个数.
   */
  readonly importedCount: number;
  /**
   * 新建的文件夹个数.
   */
  readonly createdFolderCount: number;
  /**
   * 新建的标签个数.
   */
  readonly createdTagCount: number;
}

/**
 * 去掉重复的名称, 保持首次出现的顺序.
 * @param names 名称列表, 可以含 undefined.
 * @returns 互不重复的名称.
 */
function distinctNames(
  names: readonly (string | undefined)[],
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    if (name !== undefined && !seen.has(foldForComparison(name))) {
      seen.add(foldForComparison(name));
      result.push(name);
    }
  }
  return result;
}

/**
 * 按名称取确保存在后的编号.
 * @param idsByName 折叠后的名称到编号的映射.
 * @param name 名称.
 * @returns 编号.
 * @throws Error 当名称不在映射里时, 说明确保步骤漏了这个名称.
 */
function requireId(
  idsByName: ReadonlyMap<string, string>,
  name: string,
): string {
  const id = idsByName.get(foldForComparison(name));
  if (id === undefined) {
    throw new Error("导入用到的名称没有对应的编号");
  }
  return id;
}

/**
 * 把规划好的条目写进库里, 全部在一个数据库事务里完成: 先确保用到的文件夹与标签存在 (缺的新建),
 * 再逐个写条目与它的标签关联. 任何一步抛出错误整个事务回滚, 库里不留下半成功的状态. 条目沿用
 * 新建条目的行构造规则.
 * @param orm 已解锁数据库的查询入口.
 * @param entries 要写入的条目, 已经过新建校验.
 * @param dependencies 编号与时间依赖.
 * @returns 写入的条目数与新建的文件夹, 标签个数.
 */
export function writeImport(
  orm: VaultOrm,
  entries: readonly PlannedEntry[],
  dependencies: ImportWriterDependencies,
): ImportWriteSummary {
  return orm.transaction((transaction) => {
    const folders = ensureFolders(
      transaction,
      distinctNames(entries.map((entry) => entry.folderName)),
      dependencies,
    );
    const tags = ensureTags(
      transaction,
      distinctNames(entries.flatMap((entry) => entry.tagNames)),
      dependencies,
    );
    const createdAt = dependencies.now();
    for (const entry of entries) {
      const tagIds = entry.tagNames.map((name) =>
        requireId(tags.idsByName, name),
      );
      const folderId =
        entry.folderName === undefined
          ? undefined
          : requireId(folders.idsByName, entry.folderName);
      const record = buildEntryRecord({
        type: requireEntryType(entry.typeKey),
        values: { ...entry.values, folderId },
        createIdentifier: dependencies.createIdentifier,
        createdAt,
      });
      insertEntry(transaction, record);
      if (tagIds.length > 0) {
        replaceEntryTags(transaction, record.id, tagIds);
      }
    }
    return {
      importedCount: entries.length,
      createdFolderCount: folders.createdCount,
      createdTagCount: tags.createdCount,
    };
  });
}
