import { describe, expect, it } from "vitest";

import { createEditEntrySchema } from "./edit-entry-schema";
import { createNewEntrySchema } from "./new-entry-schema";
import { LOGIN_TYPE } from "./preset-types/login-type";
import { toEntrySummary, type EntryDetail } from "./entry-types";

/**
 * 一份通用登录的新建表单取值, 没有所属文件夹.
 */
const NEW_VALUES = {
  name: "n",
  fields: { account: "a", password: "p", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  totp: "",
};

describe("条目校验方案里的所属文件夹", () => {
  it("新建校验方案: 省略或给出字符串都通过, 原样保留", () => {
    const schema = createNewEntrySchema(LOGIN_TYPE);

    const without = schema.safeParse(NEW_VALUES);
    const withFolder = schema.safeParse({ ...NEW_VALUES, folderId: "f-1" });

    expect(without.success && without.data.folderId).toBeUndefined();
    expect(withFolder.success && withFolder.data.folderId).toBe("f-1");
  });

  it("新建校验方案: 所属不是字符串时不通过", () => {
    const schema = createNewEntrySchema(LOGIN_TYPE);

    for (const folderId of [1, null, true, {}]) {
      expect(schema.safeParse({ ...NEW_VALUES, folderId }).success).toBe(false);
    }
  });

  it("编辑校验方案: 与新建一致, 省略或给出字符串都通过", () => {
    const schema = createEditEntrySchema(LOGIN_TYPE);
    const values = { ...NEW_VALUES, removeTotp: false };

    const without = schema.safeParse(values);
    const withFolder = schema.safeParse({ ...values, folderId: "f-2" });

    expect(without.success && without.data.folderId).toBeUndefined();
    expect(withFolder.success && withFolder.data.folderId).toBe("f-2");
    expect(schema.safeParse({ ...values, folderId: 3 }).success).toBe(false);
  });
});

describe("toEntrySummary 与所属文件夹", () => {
  it("摘要带上详情的所属文件夹, 未分类时没有", () => {
    const detail: EntryDetail = {
      id: "e-1",
      name: "n",
      type: "login",
      account: "a",
      fields: { account: "a" },
      notes: "",
      notesFormat: "plain",
      customFields: [],
      hasTotp: false,
      folderId: "f-1",
    };

    expect(toEntrySummary(detail).folderId).toBe("f-1");
    expect(
      toEntrySummary({ ...detail, folderId: undefined }).folderId,
    ).toBeUndefined();
  });
});
