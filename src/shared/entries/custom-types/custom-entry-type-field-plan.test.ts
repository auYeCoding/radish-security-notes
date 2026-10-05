import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "../../testing/custom-type-fixtures";
import { planCustomEntryTypeFields } from "./custom-entry-type-field-plan";
import type { CustomEntryTypeFormValues } from "./custom-entry-type-schema";

/**
 * 生成按顺序取用的编号函数: fresh-1, fresh-2.
 * @returns 编号生成函数.
 */
function sequentialIdentifiers(): () => string {
  let counter = 0;
  return () => `fresh-${(counter += 1)}`;
}

/**
 * 构造修改后的取值: 路由器三个字段的键都带上, 可以覆盖其中的取值.
 * @param fields 提交的字段, 没给时是原样提交.
 * @returns 修改后的取值.
 */
function valuesOf(
  fields: CustomEntryTypeFormValues["fields"] = [
    {
      key: "account",
      name: "地址",
      kind: "singleLine",
      isSensitive: false,
      isSummary: true,
    },
    {
      key: "field-pass",
      name: "口令",
      kind: "singleLine",
      isSensitive: true,
      isSummary: false,
    },
    {
      key: "field-note",
      name: "说明",
      kind: "multiLine",
      isSensitive: false,
      isSummary: false,
    },
  ],
): CustomEntryTypeFormValues {
  return { name: "路由器", fields };
}

describe("planCustomEntryTypeFields 键不变", () => {
  it("原样提交时每个键都保留, 没有被删字段, 不取编号", () => {
    const plan = planCustomEntryTypeFields({
      current: ROUTER_TYPE,
      values: valuesOf(),
      createIdentifier: sequentialIdentifiers(),
    });

    expect(plan.fields.map((field) => field.key)).toEqual([
      "account",
      "field-pass",
      "field-note",
    ]);
    expect(Array.from(plan.keptKeys)).toEqual([
      ["account", "account"],
      ["field-pass", "field-pass"],
      ["field-note", "field-note"],
    ]);
    expect(plan.removedKeys).toEqual([]);
  });

  it("改名, 改保密与改形态不影响键, 字段属性取自提交", () => {
    const [summary, secret, note] = valuesOf().fields;
    const plan = planCustomEntryTypeFields({
      current: ROUTER_TYPE,
      values: valuesOf([
        { ...summary, name: "新地址" },
        { ...secret, isSensitive: false, kind: "multiLine" },
        note,
      ]),
      createIdentifier: sequentialIdentifiers(),
    });

    expect(plan.fields[0]).toEqual({
      key: "account",
      name: "新地址",
      kind: "singleLine",
      isSensitive: false,
    });
    expect(plan.fields[1]).toEqual({
      key: "field-pass",
      name: "口令",
      kind: "multiLine",
      isSensitive: false,
    });
  });
});

describe("planCustomEntryTypeFields 增删字段", () => {
  it("新增字段分配 field- 加编号的新键, 新增的摘要字段取 account", () => {
    const [summary] = valuesOf().fields;
    const plan = planCustomEntryTypeFields({
      current: ROUTER_TYPE,
      values: valuesOf([
        { ...summary, isSummary: false, key: "account" },
        {
          name: "新字段",
          kind: "singleLine",
          isSensitive: false,
          isSummary: true,
        },
      ]),
      createIdentifier: sequentialIdentifiers(),
    });

    expect(plan.fields.map((field) => field.key)).toEqual([
      "field-fresh-1",
      "account",
    ]);
    expect(plan.keptKeys.get("account")).toBe("field-fresh-1");
  });

  it("提交里没有的已有字段是被删字段, 键不在保留对照里", () => {
    const [summary] = valuesOf().fields;
    const plan = planCustomEntryTypeFields({
      current: ROUTER_TYPE,
      values: valuesOf([summary]),
      createIdentifier: sequentialIdentifiers(),
    });

    expect(plan.removedKeys).toEqual(["field-pass", "field-note"]);
    expect(Array.from(plan.keptKeys.keys())).toEqual(["account"]);
  });
});

describe("planCustomEntryTypeFields 换摘要字段", () => {
  it("非摘要字段改成摘要字段, 键换成 account; 原摘要字段不再是摘要, 分配新键", () => {
    const [summary, secret, note] = valuesOf().fields;
    const plan = planCustomEntryTypeFields({
      current: ROUTER_TYPE,
      values: valuesOf([
        { ...summary, isSummary: false },
        secret,
        { ...note, kind: "singleLine", isSummary: true },
      ]),
      createIdentifier: sequentialIdentifiers(),
    });

    expect(plan.fields.map((field) => field.key)).toEqual([
      "field-fresh-1",
      "field-pass",
      "account",
    ]);
    expect(plan.keptKeys.get("account")).toBe("field-fresh-1");
    expect(plan.keptKeys.get("field-note")).toBe("account");
  });

  it("取消摘要时原摘要字段分配新键, 原键 account 不再被任何字段使用", () => {
    const [summary, secret, note] = valuesOf().fields;
    const plan = planCustomEntryTypeFields({
      current: ROUTER_TYPE,
      values: valuesOf([{ ...summary, isSummary: false }, secret, note]),
      createIdentifier: sequentialIdentifiers(),
    });

    expect(plan.fields.map((field) => field.key)).toEqual([
      "field-fresh-1",
      "field-pass",
      "field-note",
    ]);
    expect(plan.keptKeys.get("account")).toBe("field-fresh-1");
  });

  it("删除原摘要字段并指定另一个字段为摘要时, account 是被删键, 又被新摘要字段使用", () => {
    const [, secret, note] = valuesOf().fields;
    const plan = planCustomEntryTypeFields({
      current: ROUTER_TYPE,
      values: valuesOf([
        { ...secret, isSensitive: false, isSummary: true },
        note,
      ]),
      createIdentifier: sequentialIdentifiers(),
    });

    expect(plan.removedKeys).toEqual(["account"]);
    expect(plan.keptKeys.get("field-pass")).toBe("account");
    expect(plan.fields[0].key).toBe("account");
  });
});
