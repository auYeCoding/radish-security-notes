import { describe, expect, it } from "vitest";

import { requireNewEntryInput } from "./new-entry-input-guard";
import { requireUpdateEntryInput } from "./update-entry-input-guard";

/**
 * 一份类型都正确的新建输入, 没有所属文件夹.
 */
const NEW_INPUT = {
  type: "login",
  name: "n",
  fields: { account: "a", password: "p", url: "" },
  notes: "",
  customFields: [],
  totp: "",
};

/**
 * 一份类型都正确的更新输入, 没有所属文件夹.
 */
const UPDATE_INPUT = {
  name: "n",
  fields: { account: "a", password: "p", url: "" },
  notes: "",
  customFields: [],
  totp: "",
  removeTotp: false,
};

describe("新建输入里的所属文件夹", () => {
  it("给出字符串时原样保留, 省略时为 undefined", () => {
    expect(
      requireNewEntryInput({ ...NEW_INPUT, folderId: "f-1" }).folderId,
    ).toBe("f-1");
    expect(requireNewEntryInput(NEW_INPUT).folderId).toBeUndefined();
    expect(
      requireNewEntryInput({ ...NEW_INPUT, folderId: undefined }).folderId,
    ).toBeUndefined();
  });

  it("给出的不是字符串时抛出错误", () => {
    for (const folderId of [1, null, true, {}, ["f-1"]]) {
      expect(() => requireNewEntryInput({ ...NEW_INPUT, folderId })).toThrow(
        "无效的条目内容",
      );
    }
  });
});

describe("更新输入里的所属文件夹", () => {
  it("给出字符串时原样保留, 省略时为 undefined", () => {
    expect(
      requireUpdateEntryInput({ ...UPDATE_INPUT, folderId: "f-1" }).folderId,
    ).toBe("f-1");
    expect(requireUpdateEntryInput(UPDATE_INPUT).folderId).toBeUndefined();
  });

  it("给出的不是字符串时抛出错误", () => {
    for (const folderId of [1, null, false, {}]) {
      expect(() =>
        requireUpdateEntryInput({ ...UPDATE_INPUT, folderId }),
      ).toThrow("无效的条目内容");
    }
  });
});
