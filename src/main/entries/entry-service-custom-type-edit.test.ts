import { describe, expect, it } from "vitest";

import {
  createRouterTypeFixture,
  ROUTER_NOTE_FIELD_KEY,
  ROUTER_SECRET_FIELD_KEY,
  ROUTER_SECRET_VALUE,
  ROUTER_TYPE_KEY,
  routerEntryInputOf,
} from "../testing/custom-type-entry-fixture";
import { updateEntryInputOf } from "../testing/entry-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("条目服务: 自定义类型条目的编辑", () => {
  const getHarness = useVaultServiceHarness();

  it("编辑后类型不变, 各字段取值更新, 账号随摘要字段更新", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({
        name: "新名称",
        fields: {
          account: "10.0.0.1",
          [ROUTER_SECRET_FIELD_KEY]: "changed-secret",
          [ROUTER_NOTE_FIELD_KEY]: "",
        },
      }),
    );

    expect(updated).toMatchObject({
      ok: true,
      value: {
        id: "id-1",
        name: "新名称",
        type: ROUTER_TYPE_KEY,
        account: "10.0.0.1",
        fields: {
          account: "10.0.0.1",
          [ROUTER_SECRET_FIELD_KEY]: "changed-secret",
          [ROUTER_NOTE_FIELD_KEY]: "",
        },
      },
    });
  });

  it("编辑时字段缺项被拒绝, 条目保持原样", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());
    const created = entries.create(routerEntryInputOf());

    expect(
      entries.update(
        "id-1",
        updateEntryInputOf({ fields: { account: "only-account" } }),
      ),
    ).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.get("id-1")).toEqual(created);
  });
});

describe("条目服务: 自定义类型条目的复制", () => {
  const getHarness = useVaultServiceHarness();

  it("复制把摘要字段, 保密字段与多行字段的值写入剪贴板", async () => {
    const { entries, writeText } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());

    entries.copyField("id-1", "account");
    entries.copyField("id-1", ROUTER_SECRET_FIELD_KEY);
    entries.copyField("id-1", ROUTER_NOTE_FIELD_KEY);

    expect(writeText.mock.calls).toEqual([
      ["192.168.1.1"],
      [ROUTER_SECRET_VALUE],
      ["机房左侧\n第二行"],
    ]);
  });

  it("不属于类型的字段取不到, 也不会写入剪贴板", async () => {
    const { entries, writeText } = await createRouterTypeFixture(getHarness());
    entries.create(routerEntryInputOf());

    expect(entries.copyField("id-1", "password")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(writeText).not.toHaveBeenCalled();
  });
});
