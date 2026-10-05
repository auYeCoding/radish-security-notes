import { describe, expect, it } from "vitest";

import { createTestObserver, draftOf } from "../testing/import-draft-fixture";
import { duplicateKeyOf } from "./import-duplicate-key";
import { planImport, type ImportPlan } from "./import-planner";
import { computePreview } from "./import-preview";
import type { VaultSnapshot } from "./import-vault-snapshot";

/**
 * 空的库.
 */
const EMPTY_VAULT: VaultSnapshot = {
  entryKeys: new Set(),
  folderNames: [],
  tagNames: [],
};

/**
 * 规划一组草稿.
 * @param drafts 草稿的覆盖项列表.
 * @returns 规划结果.
 */
function plan(...drafts: Parameters<typeof draftOf>[0][]): Promise<ImportPlan> {
  return planImport(
    "bitwardenJson",
    { drafts: drafts.map((draft) => draftOf(draft)), notImported: [] },
    createTestObserver(),
  );
}

describe("导入预览: 条目统计", () => {
  it("统计类型分布, 顺序与预设类型一致, 没有条目的类型不出现", async () => {
    const result = await plan(
      { name: "笔记", typeKey: "secureNote", fields: {} },
      { name: "甲" },
      { name: "乙" },
      { name: "丙", typeKey: undefined },
    );
    const { preview } = computePreview(result, EMPTY_VAULT);
    expect(preview.typeCounts).toEqual([
      { typeKey: "login", count: 2 },
      { typeKey: "secureNote", count: 1 },
    ]);
    expect(preview.totalEntryCount).toBe(4);
    expect(preview.importableEntryCount).toBe(3);
    expect(preview.skippedEntryCount).toBe(1);
    expect(preview.notImportedCount).toBe(1);
  });
});

describe("导入预览: 文件夹, 标签与重复", () => {
  it("新建的文件夹与标签数不含库里已有的 (忽略 A-Z 大小写) 与重复名称", async () => {
    const result = await plan(
      { name: "甲", folderPath: "Work", tagNames: ["Boss", "新"] },
      { name: "乙", folderPath: "work", tagNames: ["新"] },
      { name: "丙", folderPath: "家庭" },
    );
    const { preview } = computePreview(result, {
      entryKeys: new Set(),
      folderNames: ["WORK"],
      tagNames: ["boss"],
    });
    expect(preview.newFolderCount).toBe(1);
    expect(preview.newTagCount).toBe(1);
  });

  it("按判重键标出与库里已有条目重复的条目, 给出序号与个数", async () => {
    const result = await plan({ name: "甲" }, { name: "乙" });
    const existing = duplicateKeyOf("乙", {
      account: "alice",
      url: "https://example.com",
    });
    const { preview, duplicateIndexes } = computePreview(result, {
      ...EMPTY_VAULT,
      entryKeys: new Set([existing]),
    });
    expect(preview.duplicateCount).toBe(1);
    expect([...duplicateIndexes]).toEqual([1]);
  });
});
