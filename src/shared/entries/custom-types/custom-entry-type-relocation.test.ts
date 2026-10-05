import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "../../testing/custom-type-fixtures";
import type { EntryCustomField } from "../custom-field-types";
import {
  RELOCATION_TARGET_TYPE_KEY,
  relocateEntryValues,
} from "./custom-entry-type-relocation";

/**
 * 条目原有的一个自定义字段.
 */
const EXISTING_CUSTOM_FIELD: EntryCustomField = {
  id: "existing",
  label: "原有",
  value: "原有值",
  isHidden: false,
};

/**
 * 生成按顺序取用的编号函数: new-1, new-2.
 * @returns 编号生成函数.
 */
function sequentialIdentifiers(): () => string {
  let counter = 0;
  return () => `new-${(counter += 1)}`;
}

describe("relocateEntryValues", () => {
  it("目标类型是安全笔记", () => {
    expect(RELOCATION_TARGET_TYPE_KEY).toBe("secureNote");
  });

  it("有值的字段按字段顺序转成自定义字段, 接在原有的自定义字段后面", () => {
    const relocated = relocateEntryValues({
      type: ROUTER_TYPE,
      stored: {
        account: "192.168.1.1",
        "field-pass": "口令值",
        "field-note": "第一行\n第二行",
      },
      customFields: [EXISTING_CUSTOM_FIELD],
      createIdentifier: sequentialIdentifiers(),
    });

    expect(relocated.customFields).toEqual([
      EXISTING_CUSTOM_FIELD,
      { id: "new-1", label: "地址", value: "192.168.1.1", isHidden: false },
      { id: "new-2", label: "口令", value: "口令值", isHidden: true },
      { id: "new-3", label: "说明", value: "第一行\n第二行", isHidden: false },
    ]);
  });

  it("类型字段取值清空, 条目不再留着旧键下的值", () => {
    const relocated = relocateEntryValues({
      type: ROUTER_TYPE,
      stored: { account: "a", "field-stale": "过期" },
      customFields: [],
      createIdentifier: sequentialIdentifiers(),
    });

    expect(relocated.fields).toEqual({});
  });

  it("空值与没有存过的字段不转, 全是空值时自定义字段保持原样", () => {
    const relocated = relocateEntryValues({
      type: ROUTER_TYPE,
      stored: { account: "", "field-pass": "" },
      customFields: [EXISTING_CUSTOM_FIELD],
      createIdentifier: sequentialIdentifiers(),
    });

    expect(relocated.customFields).toEqual([EXISTING_CUSTOM_FIELD]);
  });
});
