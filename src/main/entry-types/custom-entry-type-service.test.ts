import { describe, expect, it } from "vitest";

import {
  CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH,
  CUSTOM_ENTRY_TYPE_MAX_FIELDS,
  CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH,
} from "@shared/entries/custom-types/custom-entry-type-limits";

import {
  createCustomEntryTypeFixture,
  createUnlockedCustomEntryTypeFixture,
  newCustomTypeInputOf,
  simpleTypeInputOf,
} from "../testing/custom-entry-type-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";

/**
 * 用 `newCustomTypeInputOf()` 新建后期望的自定义类型: 类型键带 custom: 前缀, 摘要字段键是 account,
 * 其余字段键带 field- 前缀.
 */
const EXPECTED_ROUTER_TYPE = {
  id: "type-1",
  key: "custom:type-1",
  name: "路由器",
  fields: [
    { key: "account", name: "地址", kind: "singleLine", isSensitive: false },
    {
      key: "field-type-2",
      name: "口令",
      kind: "singleLine",
      isSensitive: true,
    },
    {
      key: "field-type-3",
      name: "说明",
      kind: "multiLine",
      isSensitive: false,
    },
  ],
};

describe("自定义类型服务: 未解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("列出与新建都因保险库未解锁而失败", async () => {
    const vault = await startService(getHarness());
    const { customTypes } = createCustomEntryTypeFixture(vault);
    const locked = { ok: false, reason: "vault-locked" };

    expect(customTypes.list()).toEqual(locked);
    expect(customTypes.create(newCustomTypeInputOf())).toEqual(locked);
  });
});

describe("自定义类型服务: 列出", () => {
  const getHarness = useVaultServiceHarness();

  it("没有自定义类型时列表为空", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());

    expect(customTypes.list()).toEqual({ ok: true, value: [] });
  });

  it("名称与字段名去首尾空格, 按创建先后列出, 新的在末尾", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());

    customTypes.create(simpleTypeInputOf("  甲类型  ", "  字段甲  "));
    customTypes.create(simpleTypeInputOf("乙类型"));
    const listed = customTypes.list();

    expect(
      listed.ok &&
        listed.value.map((type) => [type.name, type.fields[0]?.name]),
    ).toEqual([
      ["甲类型", "字段甲"],
      ["乙类型", "甲"],
    ]);
  });
});

describe("自定义类型服务: 新建", () => {
  const getHarness = useVaultServiceHarness();

  it("新建后返回完整类型: 类型键带 custom: 前缀, 摘要字段键是 account, 其余字段键带 field- 前缀", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());

    const created = customTypes.create(newCustomTypeInputOf());

    expect(created.ok && created.value).toEqual(EXPECTED_ROUTER_TYPE);
  });

  it("名称与字段名刚好是上限, 字段个数刚好是上限时通过", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());
    const fields = Array.from(
      { length: CUSTOM_ENTRY_TYPE_MAX_FIELDS },
      (_, index) => ({
        name:
          index === 0
            ? "字".repeat(CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH)
            : `字段${index}`,
        kind: "singleLine" as const,
        isSensitive: false,
        isSummary: false,
      }),
    );

    const created = customTypes.create({
      name: "类".repeat(CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH),
      fields,
    });

    expect(created.ok).toBe(true);
  });
});
