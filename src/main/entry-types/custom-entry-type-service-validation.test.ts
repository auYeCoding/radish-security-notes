import { describe, expect, it } from "vitest";

import {
  CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH,
  CUSTOM_ENTRY_TYPE_MAX_FIELDS,
  CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH,
} from "@shared/entries/custom-types/custom-entry-type-limits";
import type {
  CustomEntryTypeFieldInput,
  NewCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-types";

import { createUnlockedCustomEntryTypeFixture } from "../testing/custom-entry-type-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

/**
 * 一个合法的普通字段, 非法输入的用例在它的基础上改动.
 */
const FIELD: CustomEntryTypeFieldInput = {
  name: "字段",
  kind: "singleLine",
  isSensitive: false,
  isSummary: false,
};

/**
 * 构造只有给定字段的类型输入, 类型名称合法.
 * @param fields 类型的字段.
 * @returns 新建类型输入.
 */
function withFields(
  fields: readonly CustomEntryTypeFieldInput[],
): NewCustomEntryTypeInput {
  return { name: "类型", fields };
}

/**
 * 各种非法的新建类型输入: 说明与输入.
 */
const INVALID_INPUTS: ReadonlyArray<
  readonly [string, NewCustomEntryTypeInput]
> = [
  ["空名称", { name: "", fields: [FIELD] }],
  ["只有空格的名称", { name: "   ", fields: [FIELD] }],
  [
    "名称超过上限",
    {
      name: "类".repeat(CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH + 1),
      fields: [FIELD],
    },
  ],
  ["没有字段", withFields([])],
  [
    "字段个数超过上限",
    withFields(
      Array.from({ length: CUSTOM_ENTRY_TYPE_MAX_FIELDS + 1 }, (_, index) => ({
        ...FIELD,
        name: `字段${index}`,
      })),
    ),
  ],
  ["字段名为空", withFields([{ ...FIELD, name: " " }])],
  [
    "字段名超过上限",
    withFields([
      {
        ...FIELD,
        name: "字".repeat(CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH + 1),
      },
    ]),
  ],
  [
    "字段名重复",
    withFields([
      { ...FIELD, name: "Host" },
      { ...FIELD, name: " host" },
    ]),
  ],
  [
    "未知的取值形态",
    withFields([{ ...FIELD, kind: "date" as unknown as "singleLine" }]),
  ],
  [
    "两个摘要字段",
    withFields([
      { ...FIELD, name: "甲", isSummary: true },
      { ...FIELD, name: "乙", isSummary: true },
    ]),
  ],
  [
    "保密的摘要字段",
    withFields([{ ...FIELD, isSummary: true, isSensitive: true }]),
  ],
  [
    "多行的摘要字段",
    withFields([{ ...FIELD, isSummary: true, kind: "multiLine" }]),
  ],
];

describe("自定义类型服务: 非法输入被拒绝且不写入", () => {
  const getHarness = useVaultServiceHarness();

  it.each(INVALID_INPUTS)("%s", async (_title, input) => {
    const { customTypes, failures } =
      await createUnlockedCustomEntryTypeFixture(getHarness());

    expect(customTypes.create(input)).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(customTypes.list()).toEqual({ ok: true, value: [] });
    expect(failures).toEqual([]);
  });

  it("不是对象的输入被拒绝", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());

    expect(customTypes.create(undefined as never)).toEqual({
      ok: false,
      reason: "invalid-input",
    });
  });
});
