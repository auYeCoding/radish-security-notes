import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";

import {
  createEntryServiceFixture,
  detailOf,
  newEntryInputOf,
  sampleFieldValuesOf,
} from "../testing/entry-service-fixture";
import {
  prepareMasterPasswordVault,
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

describe("条目服务: 持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("关闭重开并解锁后条目, 备注与自定义字段仍在", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    createEntryServiceFixture(vault).entries.create(
      newEntryInputOf({
        name: "论坛",
        fields: { account: "a", password: "p", url: "https://example.test" },
        notes: "第一行\n第二行",
        customFields: [{ label: "助记词", value: "x y\nz", isHidden: true }],
      }),
    );
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const detail = createEntryServiceFixture(reopened).entries.get("id-1");

    expect(detail).toEqual({
      ok: true,
      value: detailOf({
        name: "论坛",
        account: "a",
        fields: { account: "a", password: "p", url: "https://example.test" },
        notes: "第一行\n第二行",
        customFields: [
          { id: "id-2", label: "助记词", value: "x y\nz", isHidden: true },
        ],
      }),
    });
  });
});

describe("条目服务: 全部预设类型持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("每个预设类型的条目关闭重开并解锁后类型与全部字段仍在", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { entries } = createEntryServiceFixture(vault);
    const created = PRESET_ENTRY_TYPES.map((type) =>
      entries.create(
        newEntryInputOf({
          type: type.key,
          name: `条目 ${type.key}`,
          fields: sampleFieldValuesOf(type),
        }),
      ),
    );
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedEntries = createEntryServiceFixture(reopened).entries;

    for (const result of created) {
      expect(result.ok && reopenedEntries.get(result.value.id)).toEqual(result);
    }
    expect(created.every((result) => result.ok)).toBe(true);
  });
});

describe("条目服务: 意外错误", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库抛出错误时通知回调并返回意外错误", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const brokenOrm = {
      select: () => {
        throw new Error("boom");
      },
    } as unknown as VaultOrm;
    const { entries, failures } = createEntryServiceFixture(
      vault,
      () => brokenOrm,
    );

    const result = entries.list();

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(failures).toHaveLength(1);
  });
});

describe("条目服务: 磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库文件里搜不到全部类型全部字段, 备注与自定义字段的原始, 十六进制与 base64 形式", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const vault = await startService(harness);
    await vault.unlock(TEST_MASTER_PASSWORD);
    const { entries } = createEntryServiceFixture(vault);
    const secrets = ["disk-notes-line-1", "disk-notes-line-2", "disk-label"];
    for (const type of PRESET_ENTRY_TYPES) {
      const fields = sampleFieldValuesOf(type);
      entries.create(
        newEntryInputOf({
          type: type.key,
          name: `disk-name-${type.key}`,
          fields,
          notes: "disk-notes-line-1\ndisk-notes-line-2",
          customFields: [
            {
              label: "disk-label",
              value: `disk-value-${type.key}`,
              isHidden: true,
            },
          ],
        }),
      );
      secrets.push(`disk-name-${type.key}`, `disk-value-${type.key}`);
      secrets.push(
        ...Object.values(fields).flatMap((value) => value.split("\n")),
      );
      secrets.push(...Object.values(fields));
    }
    vault.close();

    const content = await readFile(harness.paths.databaseFile);

    for (const secret of new Set(secrets)) {
      expect(content.includes(Buffer.from(secret))).toBe(false);
      expect(content.includes(Buffer.from(secret).toString("hex"))).toBe(false);
      expect(content.includes(Buffer.from(secret).toString("base64"))).toBe(
        false,
      );
    }
  });
});
