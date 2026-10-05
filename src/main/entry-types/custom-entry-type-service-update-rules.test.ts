import { describe, expect, it } from "vitest";

import { CUSTOM_ENTRY_TYPE_MAX_FIELDS } from "@shared/entries/custom-types/custom-entry-type-limits";
import en from "@shared/locales/en.json";
import zh from "@shared/locales/zh.json";

import {
  createCustomEntryTypeFixture,
  createUnlockedCustomEntryTypeFixture,
  simpleTypeInputOf,
} from "../testing/custom-entry-type-fixture";
import {
  createRouterTypeFixture,
  ROUTER_NOTE_FIELD_KEY,
  ROUTER_SECRET_FIELD_KEY,
  ROUTER_SECRET_VALUE,
  routerEntryInputOf,
} from "../testing/custom-type-entry-fixture";
import {
  routerEditedFields,
  routerUpdateInputOf,
  storedEntryOf,
} from "../testing/custom-type-update-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";

/**
 * 会被拒绝的修改: 标题与对默认修改输入的覆盖.
 */
const INVALID_UPDATE_PATCHES = [
  ["空名称", { name: "  " }],
  ["没有字段", { fields: [] }],
  [
    "字段名重复",
    {
      fields: [
        { ...routerEditedFields()[0], name: "同名" },
        { ...routerEditedFields()[1], name: " 同名 " },
      ],
    },
  ],
  [
    "两个摘要字段",
    {
      fields: [
        routerEditedFields()[0],
        { ...routerEditedFields()[2], kind: "singleLine", isSummary: true },
      ],
    },
  ],
  [
    "保密字段当摘要",
    {
      fields: [{ ...routerEditedFields()[0], isSensitive: true }],
    },
  ],
  [
    "字段键不属于该类型",
    {
      fields: [
        ...routerEditedFields(),
        {
          key: "field-foreign",
          name: "外来",
          kind: "singleLine",
          isSensitive: false,
          isSummary: false,
        },
      ],
    },
  ],
  [
    "同一个字段键用了两次",
    {
      fields: [
        routerEditedFields()[0],
        { ...routerEditedFields()[0], name: "另一个", isSummary: false },
      ],
    },
  ],
] as const;

describe("自定义类型服务: 修改时拒绝非法输入", () => {
  const getHarness = useVaultServiceHarness();

  it.each(INVALID_UPDATE_PATCHES)(
    "%s时是 invalid-input, 类型与条目都不变",
    async (_title, patch) => {
      const { customTypes, entries, vault } =
        await createRouterTypeFixture(getHarness());
      entries.create(routerEntryInputOf());
      const typesBefore = customTypes.list();
      const entryBefore = storedEntryOf(vault, "id-1");

      const result = customTypes.update(
        routerUpdateInputOf({ ...patch, isImpactConfirmed: true }),
      );

      expect(result).toEqual({ ok: false, reason: "invalid-input" });
      expect(customTypes.list()).toEqual(typesBefore);
      expect(storedEntryOf(vault, "id-1")).toEqual(entryBefore);
    },
  );

  it("字段个数超过上限时是 invalid-input", async () => {
    const { customTypes } = await createRouterTypeFixture(getHarness());
    const fields = Array.from(
      { length: CUSTOM_ENTRY_TYPE_MAX_FIELDS + 1 },
      (_, index) => ({
        name: `字段${index}`,
        kind: "singleLine" as const,
        isSensitive: false,
        isSummary: false,
      }),
    );

    expect(customTypes.update(routerUpdateInputOf({ fields }))).toEqual({
      ok: false,
      reason: "invalid-input",
    });
  });
});

describe("自定义类型服务: 修改时找不到类型与未解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("没有这个类型编号时是 not-found, 预设类型不能修改", async () => {
    const { customTypes } = await createRouterTypeFixture(getHarness());

    expect(customTypes.update(routerUpdateInputOf({ id: "missing" }))).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(customTypes.update(routerUpdateInputOf({ id: "login" }))).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(
      customTypes.update(routerUpdateInputOf({ id: "custom:type-1" })),
    ).toEqual({ ok: false, reason: "not-found" });
  });

  it("未解锁时是 vault-locked", async () => {
    const vault = await startService(getHarness());
    const { customTypes } = createCustomEntryTypeFixture(vault);

    expect(customTypes.update(routerUpdateInputOf())).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });
});

describe("自定义类型服务: 修改时的重名校验", () => {
  const getHarness = useVaultServiceHarness();

  it("改成其它自定义类型的名称 (忽略首尾空格与英文大小写) 被拒绝", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());
    customTypes.create(simpleTypeInputOf("Router", "甲"));
    const second = customTypes.create(simpleTypeInputOf("交换机", "乙"));
    const secondId = second.ok ? second.value.id : "";

    const result = customTypes.update({
      id: secondId,
      name: " router ",
      fields: [
        {
          key: "field-type-4",
          name: "乙",
          kind: "singleLine",
          isSensitive: false,
          isSummary: false,
        },
      ],
      isImpactConfirmed: false,
    });

    expect(result).toEqual({ ok: false, reason: "name-taken" });
    const listed = customTypes.list();
    expect(listed.ok && listed.value.map((type) => type.name)).toEqual([
      "Router",
      "交换机",
    ]);
  });

  it("改成预设类型的中文名或英文名被拒绝", async () => {
    const { customTypes } = await createRouterTypeFixture(getHarness());
    const taken = { ok: false, reason: "name-taken" };

    expect(
      customTypes.update(routerUpdateInputOf({ name: zh.entryTypes.server })),
    ).toEqual(taken);
    expect(
      customTypes.update(routerUpdateInputOf({ name: en.entryTypes.server })),
    ).toEqual(taken);
  });

  it("保留原名称, 或只改大小写与首尾空格, 不算重名", async () => {
    const { customTypes } = await createRouterTypeFixture(getHarness());

    expect(
      customTypes.update(routerUpdateInputOf({ name: " 路由器 " })).ok,
    ).toBe(true);
    expect(customTypes.update(routerUpdateInputOf({ name: "路由器" })).ok).toBe(
      true,
    );
  });
});

describe("自定义类型服务: 修改的影响需要确认", () => {
  const getHarness = useVaultServiceHarness();

  it("删除有取值的字段而没有确认时是 confirmation-required, 不写库", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const typesBefore = customTypes.list();
    const entryBefore = storedEntryOf(vault, "id-1");
    const [summary, , note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({ name: "新名字", fields: [summary, note] }),
    );

    expect(result).toEqual({ ok: false, reason: "confirmation-required" });
    expect(customTypes.list()).toEqual(typesBefore);
    expect(storedEntryOf(vault, "id-1")).toEqual(entryBefore);
  });

  it("保密字段改成非保密而没有确认时是 confirmation-required, 确认后生效", async () => {
    const { customTypes } = await createRouterTypeFixture(getHarness());
    const [summary, secret, note] = routerEditedFields();
    const fields = [summary, { ...secret, isSensitive: false }, note];

    expect(customTypes.update(routerUpdateInputOf({ fields }))).toEqual({
      ok: false,
      reason: "confirmation-required",
    });
    const confirmed = customTypes.update(
      routerUpdateInputOf({ fields, isImpactConfirmed: true }),
    );
    expect(confirmed.ok && confirmed.value.fields[1].isSensitive).toBe(false);
  });
});

describe("自定义类型服务: 变得更安全的修改不需要确认", () => {
  const getHarness = useVaultServiceHarness();

  it("非保密字段改成保密不需要确认", async () => {
    const { customTypes } = await createRouterTypeFixture(getHarness());
    const [summary, secret, note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({
        fields: [
          { ...summary, isSummary: false },
          secret,
          { ...note, isSensitive: true },
        ],
      }),
    );

    expect(result.ok).toBe(true);
  });
});

describe("自定义类型服务: 保密属性变化后搜索白名单立即生效", () => {
  const getHarness = useVaultServiceHarness();

  it("保密改非保密后值可以搜到, 改回保密后又搜不到", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();
    expect(entries.search(ROUTER_SECRET_VALUE)).toEqual({
      ok: true,
      value: [],
    });

    customTypes.update(
      routerUpdateInputOf({
        fields: [summary, { ...secret, isSensitive: false }, note],
        isImpactConfirmed: true,
      }),
    );
    expect(entries.search(ROUTER_SECRET_VALUE)).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: [ROUTER_SECRET_FIELD_KEY] }],
    });

    customTypes.update(routerUpdateInputOf());
    expect(entries.search(ROUTER_SECRET_VALUE)).toEqual({
      ok: true,
      value: [],
    });
  });
});

describe("自定义类型服务: 改保密与删字段后的搜索", () => {
  const getHarness = useVaultServiceHarness();

  it("非保密改保密后原来能搜到的值搜不到, 被删字段的值也搜不到", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();
    expect(entries.search("机房").ok).toBe(true);

    customTypes.update(
      routerUpdateInputOf({
        fields: [summary, secret, { ...note, isSensitive: true }],
      }),
    );
    expect(entries.search("机房")).toEqual({ ok: true, value: [] });

    customTypes.update(
      routerUpdateInputOf({ fields: [summary], isImpactConfirmed: true }),
    );
    expect(entries.search(ROUTER_NOTE_FIELD_KEY)).toEqual({
      ok: true,
      value: [],
    });
    expect(entries.search("192.168")).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: ["account"] }],
    });
  });
});
