import { describe, expect, it } from "vitest";

import { findEntry, listEntrySummaries } from "../entries/entry-repository";
import { listFolders } from "../folders/folder-repository";
import { listTagIdsByEntry } from "../tags/entry-tag-repository";
import { listTags } from "../tags/tag-repository";
import { createTestObserver, draftOf } from "../testing/import-draft-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { planImport, type PlannedEntry } from "./import-planner";
import { writeImport, type ImportWriterDependencies } from "./import-writer";

/**
 * 规划一组草稿并取出待写条目.
 * @param drafts 草稿的覆盖项列表.
 * @returns 待写条目.
 */
async function plannedEntriesOf(
  ...drafts: Parameters<typeof draftOf>[0][]
): Promise<readonly PlannedEntry[]> {
  const result = await planImport(
    "bitwardenJson",
    { drafts: drafts.map((draft) => draftOf(draft)), notImported: [] },
    createTestObserver(),
  );
  return result.entries;
}

/**
 * 建依次生成 n-1, n-2 ... 编号的依赖.
 * @param failAt 第几次生成编号时抛错, 不给则不抛.
 * @returns 写库依赖.
 */
function dependenciesOf(failAt?: number): ImportWriterDependencies {
  let counter = 0;
  return {
    createIdentifier: () => {
      counter += 1;
      if (counter === failAt) {
        throw new Error("注入的失败");
      }
      return `n-${counter}`;
    },
    now: () => 5000,
  };
}

describe("导入写库: 写入内容", () => {
  const getDatabase = useVaultDatabase("import-writer-content");

  it("条目, 文件夹, 标签与关联都写进库里, 沿用新建条目的行构造规则", async () => {
    const entries = await plannedEntriesOf(
      {
        name: "甲",
        fields: { account: "alice", password: "p1", url: "https://a.example" },
        notes: "备注",
        totp: "JBSWY3DPEHPK3PXP",
        customFields: [{ label: "令牌", value: "x", isHidden: true }],
        folderPath: "工作/项目",
        tagNames: ["重要", "公司"],
      },
      { name: "乙", typeKey: "secureNote", fields: { content: "正文" } },
    );
    const { orm } = getDatabase();
    const summary = writeImport(orm, entries, dependenciesOf());
    expect(summary).toEqual({
      importedCount: 2,
      createdFolderCount: 1,
      createdTagCount: 2,
    });
    expect(listFolders(orm).map((folder) => folder.name)).toEqual([
      "工作/项目",
    ]);
    expect(listTags(orm).map((tag) => [tag.name, tag.color])).toEqual([
      ["重要", "slate"],
      ["公司", "slate"],
    ]);
    const stored = listEntrySummaries(orm).find((entry) => entry.name === "甲");
    const record = findEntry(orm, stored?.id ?? "");
    expect(record?.fields.password).toBe("p1");
    expect(record?.totp).not.toBeNull();
    expect(record?.customFields[0].isHidden).toBe(true);
    expect(record?.folderId).toBe(listFolders(orm)[0].id);
    expect(listTagIdsByEntry(orm).get(stored?.id ?? "")).toEqual(
      listTags(orm).map((tag) => tag.id),
    );
  });

  it("没有文件夹与标签的条目不新建它们, 条目未分类", async () => {
    const { orm } = getDatabase();
    const entries = await plannedEntriesOf({});
    expect(writeImport(orm, entries, dependenciesOf())).toEqual({
      importedCount: 1,
      createdFolderCount: 0,
      createdTagCount: 0,
    });
    expect(listEntrySummaries(orm)[0].folderId).toBeUndefined();
  });
});

describe("导入写库: 沿用已有的文件夹与标签", () => {
  const getDatabase = useVaultDatabase("import-writer-reuse");

  it("库里已有同名 (忽略 A-Z 大小写) 的文件夹与标签时沿用, 不重复新建", async () => {
    const { orm } = getDatabase();
    const dependencies = dependenciesOf();
    const first = await plannedEntriesOf({
      folderPath: "Work",
      tagNames: ["Boss"],
    });
    writeImport(orm, first, dependencies);
    const second = writeImport(
      orm,
      await plannedEntriesOf(
        { name: "乙", folderPath: " work ", tagNames: ["boss", "新标签"] },
        { name: "丙", folderPath: "WORK", tagNames: ["BOSS"] },
      ),
      dependencies,
    );
    expect(second.createdFolderCount).toBe(0);
    expect(second.createdTagCount).toBe(1);
    expect(listFolders(orm)).toHaveLength(1);
    expect(listTags(orm)).toHaveLength(2);
  });
});

describe("导入写库: 事务", () => {
  const getDatabase = useVaultDatabase("import-writer-transaction");

  it("中途出错整个事务回滚, 库里没有任何条目, 文件夹, 标签", async () => {
    const entries = await plannedEntriesOf(
      { name: "甲", folderPath: "工作", tagNames: ["重要"] },
      { name: "乙" },
      { name: "丙" },
    );
    const { orm } = getDatabase();
    expect(() => writeImport(orm, entries, dependenciesOf(5))).toThrow(
      "注入的失败",
    );
    expect(listEntrySummaries(orm)).toEqual([]);
    expect(listFolders(orm)).toEqual([]);
    expect(listTags(orm)).toEqual([]);
  });

  it("没有条目时不写任何东西", () => {
    const { orm } = getDatabase();
    expect(writeImport(orm, [], dependenciesOf())).toEqual({
      importedCount: 0,
      createdFolderCount: 0,
      createdTagCount: 0,
    });
  });
});
