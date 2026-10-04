import { describe, expect, it } from "vitest";

import { entryFailed, entrySucceeded } from "./entry-result";
import {
  NOTES_FIELD_KEY,
  readAccount,
  toEntrySummary,
  type EntryDetail,
} from "./entry-types";

describe("readAccount", () => {
  it("取出键为 account 的字段值, 没有这个字段时为空串", () => {
    expect(readAccount({ account: "someone", password: "p" })).toBe("someone");
    expect(readAccount({ cardNumber: "1234" })).toBe("");
    expect(readAccount({})).toBe("");
  });
});

describe("toEntrySummary", () => {
  it("摘要只含编号, 名称, 类型与账号, 不含其它字段值", () => {
    const detail: EntryDetail = {
      id: "entry-1",
      name: "论坛",
      type: "forum",
      account: "someone",
      fields: { account: "someone", password: "secret", email: "", url: "" },
      notes: "备注",
      notesFormat: "plain",
      customFields: [],
      hasTotp: true,
    };

    expect(toEntrySummary(detail)).toEqual({
      id: "entry-1",
      name: "论坛",
      type: "forum",
      account: "someone",
    });
  });

  it("没有账号字段的类型摘要里账号为空串", () => {
    const detail: EntryDetail = {
      id: "entry-2",
      name: "工资卡",
      type: "bankCard",
      account: "",
      fields: { cardNumber: "6222" },
      notes: "",
      notesFormat: "plain",
      customFields: [],
      hasTotp: false,
    };

    expect(toEntrySummary(detail).account).toBe("");
  });
});

describe("备注的复制字段名", () => {
  it("是 notes", () => {
    expect(NOTES_FIELD_KEY).toBe("notes");
  });
});

describe("条目操作结果", () => {
  it("成功结果带值, 失败结果带原因", () => {
    expect(entrySucceeded("value")).toEqual({ ok: true, value: "value" });
    expect(entryFailed("not-found")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
