import { describe, expect, it } from "vitest";

import { entryFailed, entrySucceeded } from "./entry-result";
import { ENTRY_COPY_FIELDS, isEntryCopyField } from "./entry-types";

describe("isEntryCopyField", () => {
  it("可复制字段是账号与密码", () => {
    expect(ENTRY_COPY_FIELDS).toEqual(["account", "password"]);
  });

  it("账号与密码通过, 其它值不通过", () => {
    expect(isEntryCopyField("account")).toBe(true);
    expect(isEntryCopyField("password")).toBe(true);
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
