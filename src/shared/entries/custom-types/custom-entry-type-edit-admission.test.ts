import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "../../testing/custom-type-fixtures";
import zh from "../../locales/zh.json";
import { admitCustomEntryTypeUpdate } from "./custom-entry-type-edit-admission";
import type {
  EditedCustomEntryTypeFieldInput,
  UpdateCustomEntryTypeInput,
} from "./custom-entry-type-edit-types";

/**
 * 构造一个合法的修改输入: 保留路由器的三个字段, 可以覆盖其中的取值.
 * @param overrides 要覆盖的取值.
 * @returns 修改输入.
 */
function inputOf(
  overrides: Partial<UpdateCustomEntryTypeInput> = {},
): UpdateCustomEntryTypeInput {
  return {
    id: ROUTER_TYPE.id,
    name: "路由器",
    fields: [
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
    isImpactConfirmed: false,
    ...overrides,
  };
}

/**
 * 构造一个新增字段 (没有字段键).
 * @param name 字段名.
 * @returns 新增字段.
 */
function newFieldOf(name: string): EditedCustomEntryTypeFieldInput {
  return { name, kind: "singleLine", isSensitive: false, isSummary: false };
}

describe("admitCustomEntryTypeUpdate 通过", () => {
  it("合法时返回校验后的取值, 名称与字段名去首尾空格, 字段键原样保留", () => {
    const result = admitCustomEntryTypeUpdate(
      ROUTER_TYPE,
      inputOf({ name: "  交换机  " }),
      ["其它"],
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.name).toBe("交换机");
    expect(result.ok && result.value.fields.map((field) => field.key)).toEqual([
      "account",
      "field-pass",
      "field-note",
    ]);
  });

  it("类型自己原来的名称不算重名, 只改大小写或空格也通过", () => {
    expect(
      admitCustomEntryTypeUpdate(ROUTER_TYPE, inputOf({ name: " 路由器 " }), [])
        .ok,
    ).toBe(true);
  });

  it("新增的字段没有字段键也通过, 原有字段可以被删除", () => {
    const [summary] = inputOf().fields;
    const result = admitCustomEntryTypeUpdate(
      ROUTER_TYPE,
      inputOf({ fields: [summary, newFieldOf("新字段")] }),
      [],
    );

    expect(result.ok).toBe(true);
  });
});

describe("admitCustomEntryTypeUpdate 拒绝", () => {
  it("内容不合规时是 invalid-input", () => {
    expect(
      admitCustomEntryTypeUpdate(ROUTER_TYPE, inputOf({ name: "" }), []),
    ).toEqual({ ok: false, reason: "invalid-input" });
    expect(
      admitCustomEntryTypeUpdate(ROUTER_TYPE, inputOf({ fields: [] }), []),
    ).toEqual({ ok: false, reason: "invalid-input" });
  });

  it("字段键不属于该类型时是 invalid-input", () => {
    const fields = [
      ...inputOf().fields,
      { ...newFieldOf("外来"), key: "field-other" },
    ];

    expect(
      admitCustomEntryTypeUpdate(ROUTER_TYPE, inputOf({ fields }), []),
    ).toEqual({ ok: false, reason: "invalid-input" });
  });

  it("两个字段带同一个字段键时是 invalid-input", () => {
    const [first] = inputOf().fields;
    const duplicate = { ...first, name: "另一个地址", isSummary: false };

    expect(
      admitCustomEntryTypeUpdate(
        ROUTER_TYPE,
        inputOf({ fields: [first, duplicate] }),
        [],
      ),
    ).toEqual({ ok: false, reason: "invalid-input" });
  });
});

describe("admitCustomEntryTypeUpdate 重名", () => {
  it("与其它自定义类型或预设类型同名时是 name-taken", () => {
    expect(
      admitCustomEntryTypeUpdate(ROUTER_TYPE, inputOf({ name: "交换机" }), [
        " 交换机 ",
      ]),
    ).toEqual({ ok: false, reason: "name-taken" });
    expect(
      admitCustomEntryTypeUpdate(
        ROUTER_TYPE,
        inputOf({ name: zh.entryTypes.server }),
        [],
      ),
    ).toEqual({ ok: false, reason: "name-taken" });
  });

  it("内容不合规先于重名", () => {
    expect(
      admitCustomEntryTypeUpdate(ROUTER_TYPE, inputOf({ fields: [] }), [
        "路由器",
      ]),
    ).toEqual({ ok: false, reason: "invalid-input" });
  });
});
