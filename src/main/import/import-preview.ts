import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";
import type {
  ImportPreview,
  ImportTypeCount,
} from "@shared/import/import-types";
import { foldForComparison } from "@shared/text/is-same-name";

import type { ImportPlan, PlannedEntry } from "./import-planner";
import type { VaultSnapshot } from "./import-vault-snapshot";

/**
 * 预览的计算结果: 给渲染端的概要, 与判成重复的条目在规划结果里的序号.
 */
export interface PreviewComputation {
  /**
   * 给渲染端的概要.
   */
  readonly preview: ImportPreview;
  /**
   * 判成重复的条目在 `ImportPlan.entries` 里的序号.
   */
  readonly duplicateIndexes: ReadonlySet<number>;
}

/**
 * 找出与库里已有条目判成重复的条目序号.
 * @param entries 规划好的条目.
 * @param snapshot 库里现状.
 * @returns 重复条目的序号集合.
 */
function findDuplicateIndexes(
  entries: readonly PlannedEntry[],
  snapshot: VaultSnapshot,
): ReadonlySet<number> {
  const indexes = new Set<number>();
  entries.forEach((entry, index) => {
    if (snapshot.entryKeys.has(entry.duplicateKey)) {
      indexes.add(index);
    }
  });
  return indexes;
}

/**
 * 统计能导入的条目按类型的分布, 顺序与预设类型的顺序一致.
 * @param entries 规划好的条目.
 * @returns 每种有条目的类型的个数.
 */
function countTypes(entries: readonly PlannedEntry[]): ImportTypeCount[] {
  return PRESET_ENTRY_TYPES.map((type) => ({
    typeKey: type.key,
    count: entries.filter((entry) => entry.typeKey === type.key).length,
  })).filter((typeCount) => typeCount.count > 0);
}

/**
 * 数出名称里库里还没有的个数, 比较规则与文件夹, 标签的同名规则一致.
 * @param used 导入用到的名称.
 * @param existing 库里已有的名称.
 * @returns 库里还没有的不同名称的个数.
 */
function countNewNames(
  used: readonly (string | undefined)[],
  existing: readonly string[],
): number {
  const known = new Set(existing.map(foldForComparison));
  const fresh = new Set<string>();
  for (const name of used) {
    if (name !== undefined && !known.has(foldForComparison(name))) {
      fresh.add(foldForComparison(name));
    }
  }
  return fresh.size;
}

/**
 * 按规划结果与库里现状算出预览: 条目总数, 类型分布, 将新建的文件夹与标签数, 重复条目数, 将带不进
 * 的内容数. 概要只含计数, 不含任何条目的内容.
 * @param plan 规划结果.
 * @param snapshot 库里现状.
 * @returns 概要与重复条目的序号.
 */
export function computePreview(
  plan: ImportPlan,
  snapshot: VaultSnapshot,
): PreviewComputation {
  const duplicateIndexes = findDuplicateIndexes(plan.entries, snapshot);
  const preview: ImportPreview = {
    sourceKey: plan.sourceKey,
    totalEntryCount: plan.totalEntryCount,
    importableEntryCount: plan.entries.length,
    skippedEntryCount: plan.skippedEntryCount,
    typeCounts: countTypes(plan.entries),
    newFolderCount: countNewNames(
      plan.entries.map((entry) => entry.folderName),
      snapshot.folderNames,
    ),
    newTagCount: countNewNames(
      plan.entries.flatMap((entry) => entry.tagNames),
      snapshot.tagNames,
    ),
    duplicateCount: duplicateIndexes.size,
    notImportedCount: plan.notImported.length,
  };
  return { preview, duplicateIndexes };
}
