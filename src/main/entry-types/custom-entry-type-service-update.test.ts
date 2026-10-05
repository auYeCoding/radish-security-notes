import { describe, expect, it } from "vitest";

import {
  createRouterTypeFixture,
  OVERLONG_SUMMARY_VALUE,
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
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("自定义类型服务: 改名与改字段属性", () => {
  const getHarness = useVaultServiceHarness();

  it("改类型名称后列表里是新名称, 字段与已有条目不变", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const before = storedEntryOf(vault, "id-1");

    const result = customTypes.update(
      routerUpdateInputOf({ name: "  家用路由器 " }),
    );

    expect(result.ok && result.value.name).toBe("家用路由器");
    expect(result.ok && result.value.fields).toHaveLength(3);
    const listed = customTypes.list();
    expect(listed.ok && listed.value.map((type) => type.name)).toEqual([
      "家用路由器",
    ]);
    expect(storedEntryOf(vault, "id-1")).toEqual(before);
  });

  it("改取值形态后已有条目的取值原样保留, 不改写", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({
        fields: [summary, secret, { ...note, kind: "singleLine" }],
      }),
    );

    expect(result.ok && result.value.fields[2].kind).toBe("singleLine");
    const detail = entries.get("id-1");
    expect(detail.ok && detail.value.fields[ROUTER_NOTE_FIELD_KEY]).toBe(
      "机房左侧\n第二行",
    );
  });
});

describe("自定义类型服务: 改字段名", () => {
  const getHarness = useVaultServiceHarness();

  it("改字段名后字段键不变, 已有条目的取值照常按原键读出", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({
        fields: [{ ...summary, name: "网关地址" }, secret, note],
      }),
    );

    expect(result.ok && result.value.fields.map((field) => field.key)).toEqual([
      "account",
      ROUTER_SECRET_FIELD_KEY,
      ROUTER_NOTE_FIELD_KEY,
    ]);
    expect(result.ok && result.value.fields[0].name).toBe("网关地址");
    const detail = entries.get("id-1");
    expect(detail.ok && detail.value.fields.account).toBe("192.168.1.1");
    expect(storedEntryOf(vault, "id-1").fields).toEqual({
      account: "192.168.1.1",
      [ROUTER_SECRET_FIELD_KEY]: ROUTER_SECRET_VALUE,
      [ROUTER_NOTE_FIELD_KEY]: "机房左侧\n第二行",
    });
  });
});

describe("自定义类型服务: 改保密属性", () => {
  const getHarness = useVaultServiceHarness();

  it("非保密字段改成保密后搜索不到它的值, 值本身不变", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();

    customTypes.update(
      routerUpdateInputOf({
        fields: [
          { ...summary, isSummary: false },
          secret,
          { ...note, isSensitive: true },
        ],
      }),
    );

    expect(entries.search("机房")).toEqual({ ok: true, value: [] });
    const detail = entries.get("id-1");
    expect(detail.ok && detail.value.fields[ROUTER_NOTE_FIELD_KEY]).toBe(
      "机房左侧\n第二行",
    );
  });
});

describe("自定义类型服务: 增加字段", () => {
  const getHarness = useVaultServiceHarness();

  it("新增字段排在末尾, 分配 field- 键, 已有条目里它的取值是空串", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());

    const result = customTypes.update(
      routerUpdateInputOf({
        fields: [
          ...routerEditedFields(),
          {
            name: "固件版本",
            kind: "singleLine",
            isSensitive: false,
            isSummary: false,
          },
        ],
      }),
    );

    const added = result.ok ? result.value.fields[3] : undefined;
    expect(added?.name).toBe("固件版本");
    expect(added?.key).toMatch(/^field-/);
    const detail = entries.get("id-1");
    expect(detail.ok && detail.value.fields[added?.key ?? ""]).toBe("");
    expect(detail.ok && detail.value.fields.account).toBe("192.168.1.1");
  });
});

describe("自定义类型服务: 删除字段", () => {
  const getHarness = useVaultServiceHarness();

  it("确认后被删字段的键从该类型全部条目里清掉, 其余取值不变", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf({ name: "甲" }));
    entries.create(routerEntryInputOf({ name: "乙" }));
    const [summary, , note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({
        fields: [summary, note],
        isImpactConfirmed: true,
      }),
    );

    expect(result.ok && result.value.fields.map((field) => field.key)).toEqual([
      "account",
      ROUTER_NOTE_FIELD_KEY,
    ]);
    for (const id of ["id-1", "id-2"]) {
      expect(storedEntryOf(vault, id).fields).toEqual({
        account: "192.168.1.1",
        [ROUTER_NOTE_FIELD_KEY]: "机房左侧\n第二行",
      });
    }
  });
});

describe("自定义类型服务: 删除没有取值的字段", () => {
  const getHarness = useVaultServiceHarness();

  it("该字段在所有条目里都没有取值时, 不需要确认也能删除", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({
        fields: {
          account: "a",
          [ROUTER_SECRET_FIELD_KEY]: "",
          [ROUTER_NOTE_FIELD_KEY]: "n",
        },
      }),
    );
    const [summary, , note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({ fields: [summary, note] }),
    );

    expect(result.ok).toBe(true);
  });

  it("类型下没有条目时不需要确认也能删除", async () => {
    const { customTypes } = await createRouterTypeFixture(getHarness());
    const [summary] = routerEditedFields();

    expect(
      customTypes.update(routerUpdateInputOf({ fields: [summary] })).ok,
    ).toBe(true);
  });

  it("被删的保密字段值不再出现在条目详情里", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, , note] = routerEditedFields();

    customTypes.update(
      routerUpdateInputOf({ fields: [summary, note], isImpactConfirmed: true }),
    );

    const detail = entries.get("id-1");
    expect(JSON.stringify(detail)).not.toContain(ROUTER_SECRET_VALUE);
  });
});

describe("自定义类型服务: 改摘要字段", () => {
  const getHarness = useVaultServiceHarness();

  it("换摘要字段时已有条目的取值按键迁移, 列表摘要随之变成新摘要字段的值", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({
        fields: [
          { ...summary, isSummary: false },
          secret,
          { ...note, kind: "singleLine", isSummary: true },
        ],
      }),
    );

    const fields = result.ok ? result.value.fields : [];
    const demoted = fields[0];
    expect(demoted.key).toMatch(/^field-/);
    expect(fields[2].key).toBe("account");
    expect(storedEntryOf(vault, "id-1").fields).toEqual({
      [demoted.key]: "192.168.1.1",
      [ROUTER_SECRET_FIELD_KEY]: ROUTER_SECRET_VALUE,
      account: "机房左侧\n第二行",
    });
    const listed = entries.list();
    expect(listed.ok && listed.value[0].account).toBe("机房左侧\n第二行");
  });
});

describe("自定义类型服务: 取消摘要字段", () => {
  const getHarness = useVaultServiceHarness();

  it("取消摘要时原摘要字段的取值迁到它自己的新键, 列表摘要变空", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({
        fields: [{ ...summary, isSummary: false }, secret, note],
      }),
    );

    const demotedKey = result.ok ? result.value.fields[0].key : "";
    expect(demotedKey).toMatch(/^field-/);
    expect(storedEntryOf(vault, "id-1").fields.account).toBeUndefined();
    expect(storedEntryOf(vault, "id-1").fields[demotedKey]).toBe("192.168.1.1");
    const listed = entries.list();
    expect(listed.ok && listed.value[0].account).toBe("");
  });
});

describe("自定义类型服务: 删除摘要字段", () => {
  const getHarness = useVaultServiceHarness();

  it("删除摘要字段并指定另一个字段为摘要时, 旧摘要的值被清掉, 新摘要字段的值迁入 account", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({
        fields: {
          account: "旧摘要",
          [ROUTER_SECRET_FIELD_KEY]: "新摘要值",
          [ROUTER_NOTE_FIELD_KEY]: "说明",
        },
      }),
    );
    const [, secret, note] = routerEditedFields();

    customTypes.update(
      routerUpdateInputOf({
        fields: [{ ...secret, isSensitive: false, isSummary: true }, note],
        isImpactConfirmed: true,
      }),
    );

    expect(storedEntryOf(vault, "id-1").fields).toEqual({
      account: "新摘要值",
      [ROUTER_NOTE_FIELD_KEY]: "说明",
    });
    const listed = entries.list();
    expect(listed.ok && listed.value[0].account).toBe("新摘要值");
  });
});

describe("自定义类型服务: 迁入超长的取值", () => {
  const getHarness = useVaultServiceHarness();

  it("超过摘要长度上限的取值原样迁入, 不截断", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({
        fields: {
          account: "a",
          [ROUTER_SECRET_FIELD_KEY]: "s",
          [ROUTER_NOTE_FIELD_KEY]: OVERLONG_SUMMARY_VALUE,
        },
      }),
    );
    const [summary, secret, note] = routerEditedFields();

    customTypes.update(
      routerUpdateInputOf({
        fields: [
          { ...summary, isSummary: false },
          secret,
          { ...note, kind: "singleLine", isSummary: true },
        ],
      }),
    );

    expect(storedEntryOf(vault, "id-1").fields.account).toBe(
      OVERLONG_SUMMARY_VALUE,
    );
  });
});
