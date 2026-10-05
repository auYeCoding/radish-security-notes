import { describe, expect, it } from "vitest";

import { createCustomEntryTypeFixture } from "../testing/custom-entry-type-fixture";
import {
  createRouterTypeFixtureOn,
  ROUTER_NOTE_FIELD_KEY,
  routerEntryInputOf,
} from "../testing/custom-type-entry-fixture";
import {
  routerEditedFields,
  routerUpdateInputOf,
  ROUTER_TYPE_ID,
} from "../testing/custom-type-update-fixture";
import { createEntryServiceFixture } from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

describe("自定义类型服务: 修改后的持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("修改后关闭重开并解锁, 新名称, 新字段与迁移后的条目取值都保持", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { customTypes, entries } = createRouterTypeFixtureOn(vault);
    entries.create(routerEntryInputOf());
    const [summary, secret, note] = routerEditedFields();
    customTypes.update(
      routerUpdateInputOf({
        name: "家用路由器",
        fields: [
          { ...summary, isSummary: false },
          secret,
          { ...note, kind: "singleLine", isSummary: true },
        ],
      }),
    );
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedTypes = createCustomEntryTypeFixture(reopened).customTypes;
    const reopenedEntries = createEntryServiceFixture(reopened).entries;

    const listed = reopenedTypes.list();
    expect(listed.ok && listed.value.map((type) => type.name)).toEqual([
      "家用路由器",
    ]);
    expect(
      listed.ok && listed.value[0].fields.map((field) => field.key),
    ).toContain("account");
    const summaries = reopenedEntries.list();
    expect(summaries.ok && summaries.value[0].account).toBe("机房左侧\n第二行");
    const detail = reopenedEntries.get("id-1");
    expect(detail.ok && detail.value.fields[ROUTER_NOTE_FIELD_KEY]).toBe(
      undefined,
    );
  });
});

describe("自定义类型服务: 删除后的持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("删除类型后关闭重开并解锁, 类型不在了, 条目是安全笔记并带着转出的自定义字段", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { customTypes, entries } = createRouterTypeFixtureOn(vault);
    entries.create(routerEntryInputOf());
    customTypes.remove({ id: ROUTER_TYPE_ID, isImpactConfirmed: true });
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedTypes = createCustomEntryTypeFixture(reopened).customTypes;
    const reopenedEntries = createEntryServiceFixture(reopened).entries;

    expect(reopenedTypes.list()).toEqual({ ok: true, value: [] });
    const detail = reopenedEntries.get("id-1");
    expect(detail.ok && detail.value.type).toBe("secureNote");
    expect(
      detail.ok && detail.value.customFields.map((field) => field.label),
    ).toEqual(["地址", "口令", "说明"]);
  });
});
