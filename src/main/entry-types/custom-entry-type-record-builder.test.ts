import { describe, expect, it } from "vitest";

import type { CustomEntryTypeFieldFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";

import { buildCustomEntryTypeRows } from "./custom-entry-type-record-builder";
import type { CustomEntryTypeFieldRecord } from "./custom-entry-type-repository";

/**
 * 依次返回 id-1, id-2 的编号生成函数.
 * @returns 编号生成函数.
 */
function createCounter(): () => string {
  let counter = 0;
  return () => `id-${(counter += 1)}`;
}

/**
 * 构造一个表单字段取值.
 * @param name 字段名.
 * @param overrides 要覆盖的取值.
 * @returns 字段取值.
 */
function formFieldOf(
  name: string,
  overrides: Partial<CustomEntryTypeFieldFormValues> = {},
): CustomEntryTypeFieldFormValues {
  return {
    name,
    kind: "singleLine",
    isSensitive: false,
    isSummary: false,
    ...overrides,
  };
}

/**
 * 构造期望的字段行, 属于类型 id-1.
 * @param key 字段键.
 * @param position 字段位置.
 * @param overrides 要覆盖的取值.
 * @returns 字段行.
 */
function recordOf(
  key: string,
  position: number,
  overrides: Partial<CustomEntryTypeFieldRecord> = {},
): CustomEntryTypeFieldRecord {
  return {
    typeId: "id-1",
    key,
    position,
    name: "",
    kind: "singleLine",
    isSensitive: false,
    ...overrides,
  };
}

describe("buildCustomEntryTypeRows", () => {
  it("类型编号先取, 类型行带名称与创建时间", () => {
    const rows = buildCustomEntryTypeRows({
      values: { name: "路由器", fields: [formFieldOf("口令")] },
      createIdentifier: createCounter(),
      createdAt: 99,
    });

    expect(rows.type).toEqual({ id: "id-1", name: "路由器", createdAt: 99 });
  });

  it("摘要字段的键是 account, 其余字段的键由后续编号生成, 位置按填写顺序", () => {
    const rows = buildCustomEntryTypeRows({
      values: {
        name: "路由器",
        fields: [
          formFieldOf("口令", { isSensitive: true }),
          formFieldOf("地址", { isSummary: true }),
          formFieldOf("说明", { kind: "multiLine" }),
        ],
      },
      createIdentifier: createCounter(),
      createdAt: 1,
    });

    expect(rows.fields).toEqual([
      recordOf("field-id-2", 0, { name: "口令", isSensitive: true }),
      recordOf("account", 1, { name: "地址" }),
      recordOf("field-id-3", 2, { name: "说明", kind: "multiLine" }),
    ]);
  });

  it("没有摘要字段时不会出现 account 键", () => {
    const rows = buildCustomEntryTypeRows({
      values: { name: "类型", fields: [formFieldOf("甲")] },
      createIdentifier: createCounter(),
      createdAt: 1,
    });

    expect(rows.fields.map((field) => field.key)).toEqual(["field-id-2"]);
  });
});
