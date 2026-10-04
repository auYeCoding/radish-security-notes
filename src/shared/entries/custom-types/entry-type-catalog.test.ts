import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "../../testing/custom-type-fixtures";
import { PRESET_ENTRY_TYPES } from "../preset-entry-types";
import { createEntryTypeCatalog } from "./entry-type-catalog";

describe("条目类型目录", () => {
  it("没有自定义类型时只有预设类型, 顺序是预设顺序", () => {
    const catalog = createEntryTypeCatalog([]);

    expect(catalog.types.map((type) => type.key)).toEqual(
      PRESET_ENTRY_TYPES.map((type) => type.key),
    );
    expect(catalog.customTypes).toEqual([]);
  });

  it("预设在前, 自定义按传入的先后接在后面", () => {
    const second = { ...ROUTER_TYPE, id: "second", key: "custom:second" };
    const catalog = createEntryTypeCatalog([ROUTER_TYPE, second]);

    expect(catalog.types.slice(-2).map((type) => type.key)).toEqual([
      "custom:router",
      "custom:second",
    ]);
    expect(catalog.customTypes).toHaveLength(2);
  });

  it("按类型键找得到预设与自定义类型, 找不到的键返回 undefined", () => {
    const catalog = createEntryTypeCatalog([ROUTER_TYPE]);

    expect(catalog.find("wifi")?.key).toBe("wifi");
    expect(catalog.find("custom:router")?.name).toBe("路由器");
    expect(catalog.find("custom:none")).toBeUndefined();
  });

  it("自定义类型的字段带字段名, 保密与多行标记按定义转换", () => {
    const fields = createEntryTypeCatalog([ROUTER_TYPE]).find(
      "custom:router",
    )?.fields;

    expect(fields?.map((field) => field.name)).toEqual([
      "地址",
      "口令",
      "说明",
    ]);
    expect(fields?.map((field) => field.isSensitive)).toEqual([
      false,
      true,
      false,
    ]);
    expect(fields?.map((field) => field.isMultiline)).toEqual([
      false,
      false,
      true,
    ]);
  });
});

describe("条目类型目录的取类型与搜索键", () => {
  it("预设类型没有类型名, 自定义类型带类型名", () => {
    const catalog = createEntryTypeCatalog([ROUTER_TYPE]);

    expect(catalog.find("login")?.name).toBeUndefined();
    expect(catalog.find("custom:router")?.name).toBe("路由器");
  });

  it("没有自定义类型时没有自定义可搜键", () => {
    expect(createEntryTypeCatalog([]).customSearchableFieldKeys).toEqual([]);
  });

  it("自定义可搜键只含非保密字段键", () => {
    const catalog = createEntryTypeCatalog([ROUTER_TYPE]);

    expect(catalog.customSearchableFieldKeys).toEqual([
      "account",
      "field-note",
    ]);
  });

  it("require 对未知类型键抛错, 对已知键返回定义", () => {
    const catalog = createEntryTypeCatalog([ROUTER_TYPE]);

    expect(catalog.require("custom:router").key).toBe("custom:router");
    expect(catalog.require("wifi").key).toBe("wifi");
    expect(() => catalog.require("custom:none")).toThrow("未知的条目类型");
  });
});
