import { describe, expect, it } from "vitest";

import { requireNewEntryInput } from "./new-entry-input-guard";
import { requireUpdateEntryInput } from "./update-entry-input-guard";

/**
 * 一份类型都正确的新建输入, 没有标签.
 */
const NEW_INPUT = {
  type: "login",
  name: "n",
  fields: { account: "a", password: "p", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  totp: "",
};

/**
 * 一份类型都正确的更新输入, 没有标签.
 */
const UPDATE_INPUT = {
  name: "n",
  fields: { account: "a", password: "p", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  totp: "",
  removeTotp: false,
};

describe("新建输入里的标签", () => {
  it("给出字符串数组时原样保留, 省略时为 undefined", () => {
    expect(
      requireNewEntryInput({ ...NEW_INPUT, tagIds: ["t-1", "t-2"] }).tagIds,
    ).toEqual(["t-1", "t-2"]);
    expect(requireNewEntryInput({ ...NEW_INPUT, tagIds: [] }).tagIds).toEqual(
      [],
    );
    expect(requireNewEntryInput(NEW_INPUT).tagIds).toBeUndefined();
  });

  it("给出的不是字符串数组时抛出错误", () => {
    for (const tagIds of ["t-1", 1, null, {}, [1], ["t-1", null]]) {
      expect(() => requireNewEntryInput({ ...NEW_INPUT, tagIds })).toThrow(
        "无效的条目内容",
      );
    }
  });
});

describe("更新输入里的标签", () => {
  it("给出字符串数组时原样保留, 省略时为 undefined", () => {
    expect(
      requireUpdateEntryInput({ ...UPDATE_INPUT, tagIds: ["t-1"] }).tagIds,
    ).toEqual(["t-1"]);
    expect(requireUpdateEntryInput(UPDATE_INPUT).tagIds).toBeUndefined();
  });

  it("给出的不是字符串数组时抛出错误", () => {
    for (const tagIds of ["t-1", false, null, {}, [true]]) {
      expect(() =>
        requireUpdateEntryInput({ ...UPDATE_INPUT, tagIds }),
      ).toThrow("无效的条目内容");
    }
  });
});
