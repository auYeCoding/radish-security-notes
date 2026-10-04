import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createRouterTypeFixtureOn,
  ROUTER_NOTE_FIELD_KEY,
  ROUTER_SECRET_FIELD_KEY,
  ROUTER_SECRET_VALUE,
  ROUTER_TYPE_KEY,
  routerEntryInputOf,
} from "../testing/custom-type-entry-fixture";
import { createEntryServiceFixture } from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

describe("条目服务: 自定义类型的持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("新建类型与条目, 编辑后关闭重开并解锁, 类型, 条目与取值都还在", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { entries } = createRouterTypeFixtureOn(vault);
    entries.create(routerEntryInputOf());
    entries.update("id-1", {
      name: "改过的名称",
      fields: {
        account: "10.0.0.1",
        [ROUTER_SECRET_FIELD_KEY]: ROUTER_SECRET_VALUE,
        [ROUTER_NOTE_FIELD_KEY]: "新说明",
      },
      notes: "",
      notesFormat: "plain",
      customFields: [],
      totp: "",
      removeTotp: false,
    });
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedEntries = createEntryServiceFixture(reopened).entries;
    const detail = reopenedEntries.get("id-1");
    const listed = reopenedEntries.list();

    expect(detail).toMatchObject({
      ok: true,
      value: {
        name: "改过的名称",
        type: ROUTER_TYPE_KEY,
        account: "10.0.0.1",
        fields: {
          account: "10.0.0.1",
          [ROUTER_SECRET_FIELD_KEY]: ROUTER_SECRET_VALUE,
          [ROUTER_NOTE_FIELD_KEY]: "新说明",
        },
      },
    });
    expect(listed.ok && listed.value.map((entry) => entry.account)).toEqual([
      "10.0.0.1",
    ]);
  });
});

describe("条目服务: 自定义类型的条目磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库文件里搜不到保密字段的值与摘要字段的值", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { entries } = createRouterTypeFixtureOn(vault);
    entries.create(routerEntryInputOf());
    vault.close();

    const content = await readFile(harness.paths.databaseFile);

    expect(content.includes(Buffer.from(ROUTER_SECRET_VALUE))).toBe(false);
    expect(content.includes(Buffer.from("192.168.1.1"))).toBe(false);
  });
});
