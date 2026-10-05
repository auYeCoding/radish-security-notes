import { describe, expect, it } from "vitest";

import { ENTRY_NAME_MAX_LENGTH } from "@shared/entries/new-entry-schema";

import { createTestObserver, draftOf } from "../testing/import-draft-fixture";
import { planImport, type ImportPlan } from "./import-planner";

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

describe("规划导入: 合格的草稿", () => {
  it("变成待写条目, 名称去首尾空格, 类型字段补全, 备注是纯文本", async () => {
    const result = await plan({
      name: "  邮箱  ",
      typeKey: "secureNote",
      fields: { content: "正文" },
    });
    expect(result.totalEntryCount).toBe(1);
    expect(result.skippedEntryCount).toBe(0);
    const [entry] = result.entries;
    expect(entry.typeKey).toBe("secureNote");
    expect(entry.values.name).toBe("邮箱");
    expect(entry.values.fields).toEqual({ content: "正文" });
    expect(entry.values.notesFormat).toBe("plain");
    expect(result.notImported).toEqual([]);
  });

  it("类型字段缺失的补空串", async () => {
    const result = await plan({ fields: { account: "alice" } });
    expect(result.entries[0].values.fields).toEqual({
      account: "alice",
      password: "",
      url: "",
    });
  });

  it("恰好等于上限的名称与字段可以导入", async () => {
    const result = await plan({
      name: "长".repeat(ENTRY_NAME_MAX_LENGTH),
      fields: { account: "a".repeat(200), password: "p".repeat(1000) },
    });
    expect(result.entries).toHaveLength(1);
  });
});

describe("规划导入: 整条跳过", () => {
  it("没有对应类型或类型键未登记的条目进清单", async () => {
    const result = await plan(
      { name: "护照", typeKey: undefined },
      { name: "某物", typeKey: "custom:abc" },
    );
    expect(result.entries).toHaveLength(0);
    expect(result.skippedEntryCount).toBe(2);
    expect(result.notImported).toEqual([
      { scope: "entry", name: "护照", reason: "type-unsupported" },
      { scope: "entry", name: "某物", reason: "type-unsupported" },
    ]);
  });

  it("名称为空或过长整条跳过", async () => {
    const result = await plan(
      { name: "   " },
      { name: "长".repeat(ENTRY_NAME_MAX_LENGTH + 1) },
    );
    expect(result.skippedEntryCount).toBe(2);
    expect(result.notImported.map((item) => item.reason)).toEqual([
      "name-invalid",
      "name-invalid",
    ]);
  });

  it("账号与密码超过上限整条跳过, 并写明字段名", async () => {
    const result = await plan(
      { name: "甲", fields: { account: "a".repeat(201) } },
      { name: "乙", fields: { password: "p".repeat(1001) } },
    );
    expect(result.notImported).toEqual([
      {
        scope: "entry",
        name: "甲",
        fieldName: "account",
        reason: "field-too-long",
      },
      {
        scope: "entry",
        name: "乙",
        fieldName: "password",
        reason: "field-too-long",
      },
    ]);
  });
});

describe("规划导入: 局部问题只丢这一项", () => {
  it("无法解析的 TOTP 丢弃, 条目照常导入", async () => {
    const result = await plan({ name: "甲", totp: "not-a-secret!!" });
    expect(result.entries[0].values.totp).toBe("");
    expect(result.notImported).toEqual([
      { scope: "entry", name: "甲", fieldName: "TOTP", reason: "totp-invalid" },
    ]);
  });

  it("能解析的 TOTP 保留", async () => {
    const result = await plan({ totp: "JBSWY3DPEHPK3PXP" });
    expect(result.entries[0].values.totp).toBe("JBSWY3DPEHPK3PXP");
    expect(result.notImported).toEqual([]);
  });

  it("字段名为空的自定义字段丢弃, 其余保留", async () => {
    const result = await plan({
      name: "甲",
      customFields: [
        { label: "  ", value: "x", isHidden: false },
        { label: "备注2", value: "y", isHidden: true },
      ],
    });
    expect(result.entries[0].values.customFields).toEqual([
      { label: "备注2", value: "y", isHidden: true },
    ]);
    expect(result.notImported).toEqual([
      { scope: "entry", name: "甲", reason: "custom-field-name-empty" },
    ]);
  });
});

describe("规划导入: 损失, 文件夹, 判重键", () => {
  it("适配器给的损失与标签损失进清单, 清单项只含名称, 字段名与原因", async () => {
    const result = await plan({
      name: "甲",
      losses: [{ reason: "favorite-unsupported" }],
      tagNames: Array.from({ length: 12 }, (_value, index) => `t${index}`),
    });
    expect(result.entries[0].tagNames).toHaveLength(10);
    const summary = result.notImported.map((item) => [
      item.reason,
      item.fieldName,
    ]);
    expect(summary).toEqual([
      ["favorite-unsupported", undefined],
      ["tag-limit-exceeded", "t10"],
      ["tag-limit-exceeded", "t11"],
    ]);
  });

  it("文件夹路径落成单层名称, 被截断的文件夹在清单里只列一次", async () => {
    const longPath = `${"外".repeat(40)}/${"内".repeat(30)}`;
    const result = await plan(
      { name: "甲", folderPath: " 工作 / 项目 " },
      { name: "乙", folderPath: longPath },
      { name: "丙", folderPath: longPath },
    );
    expect(result.entries[0].folderName).toBe("工作/项目");
    const folderItems = result.notImported.filter(
      (item) => item.scope === "folder",
    );
    expect(folderItems).toEqual([
      {
        scope: "folder",
        name: result.entries[1].folderName,
        reason: "folder-name-truncated",
      },
    ]);
  });
});

describe("规划导入: 判重键", () => {
  it("判重键由名称, 账号, 网址组成, 与大小写和首尾空格无关", async () => {
    const result = await plan(
      {
        name: "GitHub",
        fields: { account: "Alice", url: "https://github.com" },
      },
      {
        name: " github ",
        fields: { account: "alice", url: "HTTPS://github.com " },
      },
      { name: "GitHub", fields: { account: "bob", url: "https://github.com" } },
    );
    const [first, second, third] = result.entries;
    expect(first.duplicateKey).toBe(second.duplicateKey);
    expect(first.duplicateKey).not.toBe(third.duplicateKey);
  });
});

describe("规划导入: 适配器没能解析的行", () => {
  it("排在清单最前, 不计入条目总数", async () => {
    const result = await planImport(
      "browserCsv",
      {
        drafts: [draftOf({ name: "甲" })],
        notImported: [{ scope: "row", name: "5", reason: "row-malformed" }],
      },
      createTestObserver(),
    );
    expect(result.notImported[0]).toEqual({
      scope: "row",
      name: "5",
      reason: "row-malformed",
    });
    expect(result.totalEntryCount).toBe(1);
  });
});
