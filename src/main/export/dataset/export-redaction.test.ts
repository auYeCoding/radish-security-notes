import { describe, expect, it } from "vitest";

import { createEntryTypeCatalog } from "@shared/entries/custom-types/entry-type-catalog";

import type { ExportEntry } from "./export-dataset";
import { redactEntry } from "./export-redaction";

/**
 * 构造一个样例条目.
 * @param overrides 要覆盖的部分.
 * @returns 数据集里的条目.
 */
function entryOf(overrides: Partial<ExportEntry>): ExportEntry {
  return {
    id: "e-1",
    typeKey: "login",
    name: "示例",
    fields: { account: "a", password: "secret", url: "https://x" },
    notes: "备注",
    notesFormat: "plain",
    customFields: [],
    totp: { secret: "ABC", algorithm: "SHA1", digits: 6, periodSeconds: 30 },
    folderId: undefined,
    tagIds: [],
    createdAt: 1,
    attachments: [],
    ...overrides,
  };
}

describe("导出脱敏", () => {
  const catalog = createEntryTypeCatalog([]);

  it("保密字段值置空且键保留, 非保密字段不变", () => {
    const redacted = redactEntry(entryOf({}), catalog);
    expect(redacted.fields).toEqual({
      account: "a",
      password: "",
      url: "https://x",
    });
  });

  it("隐藏自定义字段值置空, 普通自定义字段不变", () => {
    const redacted = redactEntry(
      entryOf({
        customFields: [
          { id: "1", label: "问题", value: "答案", isHidden: false },
          { id: "2", label: "PIN", value: "9527", isHidden: true },
        ],
      }),
      catalog,
    );
    expect(redacted.customFields).toEqual([
      { id: "1", label: "问题", value: "答案", isHidden: false },
      { id: "2", label: "PIN", value: "", isHidden: true },
    ]);
  });

  it("TOTP 去掉", () => {
    expect(redactEntry(entryOf({}), catalog).totp).toBeUndefined();
  });

  it("类型不在目录里时无法判断保密字段, 类型字段全部置空", () => {
    const redacted = redactEntry(
      entryOf({ typeKey: "custom:gone", fields: { account: "a", x: "y" } }),
      catalog,
    );
    expect(redacted.fields).toEqual({ account: "", x: "" });
  });

  it("不改动传入的条目", () => {
    const entry = entryOf({});
    redactEntry(entry, catalog);
    expect(entry.fields["password"]).toBe("secret");
    expect(entry.totp?.secret).toBe("ABC");
  });
});
