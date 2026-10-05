import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createCustomEntryTypeFixture,
  createUnlockedCustomEntryTypeFixture,
  newCustomTypeInputOf,
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
  requireOrm,
  ROUTER_TYPE_ID,
  storedEntryOf,
} from "../testing/custom-type-update-fixture";
import { newEntryInputOf } from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";

describe("自定义类型服务: 删除没有条目的类型", () => {
  const getHarness = useVaultServiceHarness();

  it("删除后类型与字段都不在了, 其它类型不受影响", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());
    const first = customTypes.create(simpleTypeInputOf("甲类型"));
    customTypes.create(simpleTypeInputOf("乙类型"));

    const result = customTypes.remove({
      id: first.ok ? first.value.id : "",
      isImpactConfirmed: false,
    });

    expect(result).toEqual({ ok: true, value: undefined });
    const listed = customTypes.list();
    expect(listed.ok && listed.value.map((type) => type.name)).toEqual([
      "乙类型",
    ]);
  });

  it("删除后同一个名称可以重新使用", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());
    const first = customTypes.create(simpleTypeInputOf("甲类型"));
    customTypes.remove({
      id: first.ok ? first.value.id : "",
      isImpactConfirmed: false,
    });

    expect(customTypes.create(simpleTypeInputOf("甲类型")).ok).toBe(true);
  });
});

describe("自定义类型服务: 删除时的拒绝", () => {
  const getHarness = useVaultServiceHarness();

  it("没有这个类型编号时是 not-found, 预设类型不能删除", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());

    expect(
      customTypes.remove({ id: "missing", isImpactConfirmed: true }),
    ).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(
      customTypes.remove({ id: "login", isImpactConfirmed: true }),
    ).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("未解锁时是 vault-locked", async () => {
    const vault = await startService(getHarness());
    const { customTypes } = createCustomEntryTypeFixture(vault);

    expect(customTypes.remove({ id: "x", isImpactConfirmed: true })).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });
});

describe("自定义类型服务: 删除有条目的类型", () => {
  const getHarness = useVaultServiceHarness();

  it("没有确认时是 confirmation-required, 类型与条目都不变", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const typesBefore = customTypes.list();
    const entryBefore = storedEntryOf(vault, "id-1");

    const result = customTypes.remove({
      id: ROUTER_TYPE_ID,
      isImpactConfirmed: false,
    });

    expect(result).toEqual({ ok: false, reason: "confirmation-required" });
    expect(customTypes.list()).toEqual(typesBefore);
    expect(storedEntryOf(vault, "id-1")).toEqual(entryBefore);
  });
});

describe("自定义类型服务: 删除时条目的取值转移", () => {
  const getHarness = useVaultServiceHarness();

  it("确认后条目改归安全笔记, 有值的字段转成自定义字段, 保密字段转成隐藏字段", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({
        customFields: [{ label: "保修", value: "两年", isHidden: false }],
      }),
    );

    const result = customTypes.remove({
      id: ROUTER_TYPE_ID,
      isImpactConfirmed: true,
    });

    expect(result).toEqual({ ok: true, value: undefined });
    const stored = storedEntryOf(vault, "id-1");
    expect(stored.type).toBe("secureNote");
    expect(stored.fields).toEqual({});
    expect(stored.customFields.map((field) => field.label)).toEqual([
      "保修",
      "地址",
      "口令",
      "说明",
    ]);
    expect(stored.customFields.map((field) => field.value)).toEqual([
      "两年",
      "192.168.1.1",
      ROUTER_SECRET_VALUE,
      "机房左侧\n第二行",
    ]);
    expect(stored.customFields.map((field) => field.isHidden)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(new Set(stored.customFields.map((field) => field.id)).size).toBe(4);
  });
});

describe("自定义类型服务: 删除后条目的呈现", () => {
  const getHarness = useVaultServiceHarness();

  it("改归后条目的名称与备注不变, 详情按安全笔记读出, 列表摘要不再有账号", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({ name: "家里路由器", notes: "备注文本" }),
    );

    customTypes.remove({ id: ROUTER_TYPE_ID, isImpactConfirmed: true });

    const detail = entries.get("id-1");
    expect(detail.ok && detail.value.type).toBe("secureNote");
    expect(detail.ok && detail.value.name).toBe("家里路由器");
    expect(detail.ok && detail.value.notes).toBe("备注文本");
    expect(detail.ok && detail.value.fields).toEqual({ content: "" });
    const listed = entries.list();
    expect(listed.ok && listed.value[0]).toMatchObject({
      id: "id-1",
      type: "secureNote",
      account: "",
    });
  });

  it("字段取值为空的不转成自定义字段, 只转有值的", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({
        fields: {
          account: "",
          [ROUTER_SECRET_FIELD_KEY]: "",
          [ROUTER_NOTE_FIELD_KEY]: "只有说明",
        },
      }),
    );

    customTypes.remove({ id: ROUTER_TYPE_ID, isImpactConfirmed: true });

    expect(
      storedEntryOf(vault, "id-1").customFields.map((field) => field.label),
    ).toEqual(["说明"]);
  });
});

describe("自定义类型服务: 删除的范围与搜索", () => {
  const getHarness = useVaultServiceHarness();

  it("只有这个类型的条目被改归, 其它类型的条目不动", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    customTypes.create(newCustomTypeInputOf({ name: "交换机" }));
    entries.create(routerEntryInputOf({ name: "路由甲" }));
    entries.create(newEntryInputOf({ name: "登录甲" }));
    const loginBefore = storedEntryOf(vault, "id-2");

    customTypes.remove({ id: ROUTER_TYPE_ID, isImpactConfirmed: true });

    expect(storedEntryOf(vault, "id-1").type).toBe("secureNote");
    expect(storedEntryOf(vault, "id-2")).toEqual(loginBefore);
    const listed = customTypes.list();
    expect(listed.ok && listed.value.map((type) => type.name)).toEqual([
      "交换机",
    ]);
  });

  it("改归后条目里的保密值不能被搜到, 条目名称仍能搜到", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf({ name: "家里路由器" }));

    customTypes.remove({ id: ROUTER_TYPE_ID, isImpactConfirmed: true });

    expect(entries.search(ROUTER_SECRET_VALUE)).toEqual({
      ok: true,
      value: [],
    });
    expect(entries.search("家里")).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: ["name"] }],
    });
  });
});

describe("自定义类型服务: 删除失败时整体回滚", () => {
  const getHarness = useVaultServiceHarness();

  it("条目改归中途失败时类型, 字段与全部条目都不变, 返回意外错误", async () => {
    const { customTypes, entries, vault } =
      await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf({ name: "甲" }));
    entries.create(routerEntryInputOf({ name: "乙" }));
    const typesBefore = customTypes.list();
    const entriesBefore = ["id-1", "id-2"].map((id) =>
      storedEntryOf(vault, id),
    );
    requireOrm(vault).run(sql`
      create trigger abort_second_relocation before update on entries
      when old.id = 'id-2'
      begin select raise(abort, 'injected failure'); end
    `);

    const result = customTypes.remove({
      id: ROUTER_TYPE_ID,
      isImpactConfirmed: true,
    });

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(customTypes.list()).toEqual(typesBefore);
    expect(["id-1", "id-2"].map((id) => storedEntryOf(vault, id))).toEqual(
      entriesBefore,
    );
  });
});
