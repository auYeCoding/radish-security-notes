import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { describe, expect, it } from "vitest";

import type { EntrySummary } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";
import { UNCATEGORIZED_KEY } from "@shared/folders/uncategorized-key";

import {
  createEntryFolderAnnouncements,
  dragPreviewLabelOf,
} from "./entry-folder-announcements";

/**
 * 测试用的条目: 论坛与银行.
 */
const ENTRIES: readonly EntrySummary[] = [
  { id: "forum", name: "论坛", type: "login", account: "" },
  { id: "bank", name: "银行", type: "login", account: "" },
];

/**
 * 测试用的文件夹: 家庭.
 */
const FOLDERS: readonly FolderSummary[] = [{ id: "home", name: "家庭" }];

/**
 * 论坛带走论坛与银行两个条目, 其它拖拽源没有整批.
 * @param sourceId 拖拽源编号.
 * @returns 整批条目编号, 没有整批时为 undefined.
 */
function batchOf(sourceId: string): readonly string[] | undefined {
  return sourceId === "forum" ? ["forum", "bank"] : undefined;
}

describe("条目拖进文件夹的播报", () => {
  it("拖单个条目时写条目名称, 拖整批时写条目数", async () => {
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });
    const announce = createEntryFolderAnnouncements(
      ENTRIES,
      FOLDERS,
      i18n.t,
      batchOf,
    );

    expect(announce.pickedUp("bank")).toBe("已拿起条目 银行.");
    expect(announce.pickedUp("forum")).toBe("已拿起 2 个条目.");
    expect(announce.movedOver("forum", "home")).toBe("2 个条目在 家庭 上方.");
    expect(announce.movedOver("forum", undefined)).toBe(
      "2 个条目不在任何文件夹上方.",
    );
    expect(announce.dropped("forum", UNCATEGORIZED_KEY)).toBe(
      "已把 2 个条目放入 未分类.",
    );
    expect(announce.dropped("forum", undefined)).toBe(
      "2 个条目没有放入任何文件夹.",
    );
    expect(announce.cancelled("forum")).toBe("已取消移动 2 个条目.");
    expect(announce.cancelled("bank")).toBe("已取消移动条目 银行.");
  });

  it("英文播报按条目数区分单复数", async () => {
    const i18n = await createI18nInstance({
      language: "en",
      isPseudoLocalizationEnabled: false,
    });
    const announce = createEntryFolderAnnouncements(
      ENTRIES,
      FOLDERS,
      i18n.t,
      (sourceId) => (sourceId === "forum" ? ["forum"] : ["forum", "bank"]),
    );

    expect(announce.pickedUp("forum")).toBe("Picked up 1 entry.");
    expect(announce.dropped("bank", "home")).toBe("Moved 2 entries to 家庭.");
  });
});

describe("拖拽预览文字", () => {
  it("单个条目是名称, 整批是条目数", async () => {
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    expect(dragPreviewLabelOf(ENTRIES, "bank", batchOf, i18n.t)).toBe("银行");
    expect(dragPreviewLabelOf(ENTRIES, "forum", batchOf, i18n.t)).toBe(
      "2 个条目",
    );
  });
});
