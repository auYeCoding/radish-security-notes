import { describe, expect, it } from "vitest";

import { loadEntryTypeCatalog } from "../entry-types/entry-type-catalog";
import {
  createRouterTypeFixture,
  ROUTER_NOTE_FIELD_KEY,
  ROUTER_SECRET_FIELD_KEY,
  ROUTER_SECRET_VALUE,
  routerEntryInputOf,
} from "../testing/custom-type-entry-fixture";
import { newEntryInputOf } from "../testing/entry-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { listEntrySearchRows } from "./entry-search-repository";

describe("条目搜索: 自定义类型的非保密字段", () => {
  const getHarness = useVaultServiceHarness();

  it("摘要字段与多行字段的值都能搜到, 命中字段名是它们的字段键", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());

    expect(entries.search("192.168")).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: ["account"] }],
    });
    expect(entries.search("机房")).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: [ROUTER_NOTE_FIELD_KEY] }],
    });
  });

  it("名称, 备注与条目级自定义字段名照常参与搜索", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({
        notes: "serial in the box",
        customFields: [{ label: "Warranty", value: "w-1", isHidden: false }],
      }),
    );

    expect(entries.search("serial warranty")).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: ["notes", "customFieldLabel"] }],
    });
  });

  it("与预设类型的条目一起搜索时各自按自己的类型取字段", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf({ name: "路由甲" }));
    entries.create(
      newEntryInputOf({
        name: "论坛",
        fields: { account: "192.168.9.9", password: "p", url: "" },
      }),
    );

    expect(entries.search("192.168")).toEqual({
      ok: true,
      value: [
        { id: "id-1", fields: ["account"] },
        { id: "id-2", fields: ["account"] },
      ],
    });
  });
});

describe("条目搜索: 自定义类型的保密字段搜不到", () => {
  const getHarness = useVaultServiceHarness();

  it("保密字段的值搜不到, 即使条目其它字段也命中", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());

    expect(entries.search(ROUTER_SECRET_VALUE)).toEqual({
      ok: true,
      value: [],
    });
    expect(entries.search(`192.168 ${ROUTER_SECRET_VALUE}`)).toEqual({
      ok: true,
      value: [],
    });
  });

  it("条目里残留的类型之外的键即使值含关键字也搜不到", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(
      routerEntryInputOf({
        fields: {
          account: "a",
          [ROUTER_SECRET_FIELD_KEY]: "s",
          [ROUTER_NOTE_FIELD_KEY]: "n",
          "field-stale": "stale-canary-value",
        },
      }),
    );

    expect(entries.search("stale-canary-value")).toEqual({
      ok: true,
      value: [],
    });
  });
});

describe("条目搜索: 自定义类型的保密字段不离开 SQLite", () => {
  const getHarness = useVaultServiceHarness();

  it("搜索读出的列里没有保密字段的值与键", async () => {
    const { entries, vault } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const orm = vault.getOrm();
    if (orm === undefined) {
      throw new Error("保险库应已解锁");
    }
    const catalog = loadEntryTypeCatalog(orm);

    const rows = listEntrySearchRows(orm, catalog.customSearchableFieldKeys);
    const serialized = JSON.stringify(rows).toLowerCase();

    expect(serialized).not.toContain(ROUTER_SECRET_VALUE);
    expect(serialized).not.toContain(ROUTER_SECRET_FIELD_KEY);
    expect(serialized).toContain("192.168.1.1");
  });

  it("搜索时控制台没有输出保密字段的值", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());
    const logged: unknown[] = [];
    const original = console.log;
    console.log = (...args: unknown[]): void => {
      logged.push(...args);
    };

    try {
      entries.search("192.168");
      entries.search(ROUTER_SECRET_VALUE);
    } finally {
      console.log = original;
    }

    expect(JSON.stringify(logged)).not.toContain(ROUTER_SECRET_VALUE);
  });
});
