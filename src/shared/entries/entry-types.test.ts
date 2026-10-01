import { describe, expect, it } from "vitest";

import { entryFailed, entrySucceeded } from "./entry-result";
import { ENTRY_COPY_FIELDS, isEntryCopyField } from "./entry-types";

describe("isEntryCopyField", () => {
  it("按字段名可复制的是账号, 密码, 网址与备注", () => {
    expect(ENTRY_COPY_FIELDS).toEqual(["account", "password", "url", "notes"]);
  });

  it("账号, 密码, 网址与备注通过, 其它值不通过", () => {
    expect(isEntryCopyField("account")).toBe(true);
    expect(isEntryCopyField("password")).toBe(true);
    expect(isEntryCopyField("url")).toBe(true);
    expect(isEntryCopyField("notes")).toBe(true);
    expect(isEntryCopyField("customFields")).toBe(false);
    expect(isEntryCopyField("name")).toBe(false);
    expect(isEntryCopyField(undefined)).toBe(false);
    expect(isEntryCopyField(1)).toBe(false);
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
