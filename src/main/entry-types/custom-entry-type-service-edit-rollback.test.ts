import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createCustomEntryTypeFixture,
  type CustomEntryTypeFixture,
} from "../testing/custom-entry-type-fixture";
import {
  createRouterTypeFixture,
  ROUTER_SECRET_VALUE,
  routerEntryInputOf,
  type CustomTypeEntryFixture,
} from "../testing/custom-type-entry-fixture";
import {
  requireOrm,
  routerEditedFields,
  routerUpdateInputOf,
  storedEntryOf,
} from "../testing/custom-type-update-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

/**
 * 让之后对条目表的任何更新都失败的触发器, 模拟类型行已改写而条目改写中途出错.
 */
const ABORT_ENTRY_UPDATE_TRIGGER = sql`
  create trigger abort_entry_update before update on entries
  begin select raise(abort, 'injected failure'); end
`;

/**
 * 在条目表上装上让更新失败的触发器.
 * @param fixture 路由器类型与条目服务环境.
 */
function failEntryUpdates(fixture: CustomTypeEntryFixture): void {
  requireOrm(fixture.vault).run(ABORT_ENTRY_UPDATE_TRIGGER);
}

/**
 * 在同一个保险库上再建一个编号恒定的类型服务, 配合重复键让字段行写入失败.
 * @param fixture 路由器类型与条目服务环境.
 * @returns 编号恒定的类型服务环境.
 */
function constantIdentifierService(
  fixture: CustomTypeEntryFixture,
): CustomEntryTypeFixture {
  return createCustomEntryTypeFixture(fixture.vault, {
    createIdentifier: () => "same-id",
  });
}

describe("自定义类型服务: 修改失败时整体回滚", () => {
  const getHarness = useVaultServiceHarness();

  it("字段行写入失败时类型行, 字段行与条目都不变, 返回意外错误", async () => {
    const fixture = await createRouterTypeFixture(getHarness());
    fixture.entries.create(routerEntryInputOf());
    const typesBefore = fixture.customTypes.list();
    const entryBefore = storedEntryOf(fixture.vault, "id-1");
    const { customTypes, failures } = constantIdentifierService(fixture);
    const [summary, secret, note] = routerEditedFields();

    const result = customTypes.update(
      routerUpdateInputOf({
        name: "改了名字",
        fields: [
          { ...summary, isSummary: false },
          secret,
          note,
          {
            name: "新增甲",
            kind: "singleLine",
            isSensitive: false,
            isSummary: false,
          },
          {
            name: "新增乙",
            kind: "singleLine",
            isSensitive: false,
            isSummary: false,
          },
        ],
      }),
    );

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(fixture.customTypes.list()).toEqual(typesBefore);
    expect(storedEntryOf(fixture.vault, "id-1")).toEqual(entryBefore);
    expect(failures).toHaveLength(1);
  });
});

describe("自定义类型服务: 条目改写中途失败时回滚", () => {
  const getHarness = useVaultServiceHarness();

  it("条目改写中途失败时已改写的类型行与字段行一并回滚", async () => {
    const fixture = await createRouterTypeFixture(getHarness());
    fixture.entries.create(routerEntryInputOf({ name: "甲" }));
    fixture.entries.create(routerEntryInputOf({ name: "乙" }));
    const typesBefore = fixture.customTypes.list();
    const entriesBefore = ["id-1", "id-2"].map((id) =>
      storedEntryOf(fixture.vault, id),
    );
    failEntryUpdates(fixture);
    const [summary, , note] = routerEditedFields();

    const result = fixture.customTypes.update(
      routerUpdateInputOf({
        name: "改了名字",
        fields: [summary, note],
        isImpactConfirmed: true,
      }),
    );

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(fixture.customTypes.list()).toEqual(typesBefore);
    expect(
      ["id-1", "id-2"].map((id) => storedEntryOf(fixture.vault, id)),
    ).toEqual(entriesBefore);
  });
});

describe("自定义类型服务: 修改失败的日志", () => {
  const getHarness = useVaultServiceHarness();

  it("失败回调里的错误不含类型名, 字段名与条目取值", async () => {
    const fixture = await createRouterTypeFixture(getHarness());
    fixture.entries.create(routerEntryInputOf());
    const { customTypes, failures } = constantIdentifierService(fixture);
    const [summary, secret, note] = routerEditedFields();

    customTypes.update(
      routerUpdateInputOf({
        name: "保密类型新名",
        fields: [
          { ...summary, name: "保密字段新名" },
          secret,
          note,
          {
            name: "保密新增甲",
            kind: "singleLine",
            isSensitive: false,
            isSummary: false,
          },
          {
            name: "保密新增乙",
            kind: "singleLine",
            isSensitive: false,
            isSummary: false,
          },
        ],
        isImpactConfirmed: true,
      }),
    );

    expect(failures).toHaveLength(1);
    const message = failures.map((error) => String(error)).join("\n");
    expect(message).not.toContain("保密类型新名");
    expect(message).not.toContain("保密字段新名");
    expect(message).not.toContain("保密新增");
    expect(message).not.toContain(ROUTER_SECRET_VALUE);
  });
});
