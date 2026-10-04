import { describe, expect, it } from "vitest";

import {
  createRouterTypeFixture,
  ROUTER_NOTE_FIELD_KEY,
  ROUTER_SECRET_FIELD_KEY,
  ROUTER_SECRET_VALUE,
  ROUTER_TYPE_KEY,
  routerEntryInputOf,
} from "../testing/custom-type-entry-fixture";
import { newEntryInputOf } from "../testing/entry-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("条目服务: 用自定义类型新建", () => {
  const getHarness = useVaultServiceHarness();

  it("新建后详情带自定义类型键与各字段取值, 账号取自摘要字段", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    const created = entries.create(routerEntryInputOf());

    expect(created).toMatchObject({
      ok: true,
      value: {
        id: "id-1",
        name: "家里路由器",
        type: ROUTER_TYPE_KEY,
        account: "192.168.1.1",
        fields: {
          account: "192.168.1.1",
          [ROUTER_SECRET_FIELD_KEY]: ROUTER_SECRET_VALUE,
          [ROUTER_NOTE_FIELD_KEY]: "机房左侧\n第二行",
        },
        notesFormat: "plain",
      },
    });
    expect(entries.get("id-1")).toEqual(created);
  });

  it("预设类型的条目在已有自定义类型时行为不变", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    const created = entries.create(
      newEntryInputOf({ fields: { account: "a", password: "p", url: "" } }),
    );

    expect(created).toMatchObject({
      ok: true,
      value: { type: "login", account: "a" },
    });
  });
});

describe("条目服务: 自定义类型的列表摘要", () => {
  const getHarness = useVaultServiceHarness();

  it("列表摘要带类型键与账号, 摘要里没有保密字段的值", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());

    const listed = entries.list();

    expect(listed).toEqual({
      ok: true,
      value: [
        {
          id: "id-1",
          name: "家里路由器",
          type: ROUTER_TYPE_KEY,
          account: "192.168.1.1",
          folderId: undefined,
          tagIds: undefined,
        },
      ],
    });
    expect(JSON.stringify(listed)).not.toContain(ROUTER_SECRET_VALUE);
  });

  it("类型没有摘要字段时账号是空串", async () => {
    const { customTypes, entries } =
      await createRouterTypeFixture(getHarness());
    customTypes.create({
      name: "无摘要类型",
      fields: [
        {
          name: "甲",
          kind: "singleLine",
          isSensitive: false,
          isSummary: false,
        },
      ],
    });

    entries.create(
      newEntryInputOf({
        type: "custom:type-4",
        name: "无摘要条目",
        fields: { "field-type-5": "值" },
      }),
    );
    const listed = entries.list();

    expect(listed.ok && listed.value[0]?.account).toBe("");
  });
});

describe("条目服务: 自定义类型条目的共有功能", () => {
  const getHarness = useVaultServiceHarness();

  it("同样支持 TOTP, 备注格式与条目级自定义字段", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    const created = entries.create(
      routerEntryInputOf({
        notes: "# 标题",
        notesFormat: "markdown",
        customFields: [{ label: "序列号", value: "SN-1", isHidden: false }],
        totp: "JBSWY3DPEHPK3PXP",
      }),
    );

    expect(created).toMatchObject({
      ok: true,
      value: {
        notes: "# 标题",
        notesFormat: "markdown",
        customFields: [{ label: "序列号", value: "SN-1", isHidden: false }],
        hasTotp: true,
      },
    });
  });
});
