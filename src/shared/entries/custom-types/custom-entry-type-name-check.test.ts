import { describe, expect, it } from "vitest";

import en from "../../locales/en.json";
import zh from "../../locales/zh.json";
import { isCustomTypeNameTaken } from "./custom-entry-type-name-check";

describe("isCustomTypeNameTaken", () => {
  it("与预设类型的中文名或英文名同名时被占用, 忽略首尾空格与英文大小写", () => {
    expect(isCustomTypeNameTaken(zh.entryTypes.server, [])).toBe(true);
    expect(isCustomTypeNameTaken(en.entryTypes.server, [])).toBe(true);
    expect(
      isCustomTypeNameTaken(` ${en.entryTypes.server.toUpperCase()} `, []),
    ).toBe(true);
  });

  it("与已有自定义类型同名时被占用, 忽略首尾空格与英文大小写", () => {
    expect(isCustomTypeNameTaken("路由器", ["路由器"])).toBe(true);
    expect(isCustomTypeNameTaken(" Router ", ["router"])).toBe(true);
  });

  it("不与任何类型同名时没有被占用", () => {
    expect(isCustomTypeNameTaken("路由器", ["交换机"])).toBe(false);
    expect(isCustomTypeNameTaken("路由器", [])).toBe(false);
  });
});
