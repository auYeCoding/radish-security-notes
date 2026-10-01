import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import {
  prepareMasterPasswordVault,
  startService,
  useVaultServiceHarness,
  type VaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { VaultService } from "../vault/vault-service";
import type { ClipboardPort } from "./clipboard-port";
import { EntryService } from "./entry-service";

/**
 * 测试里的一次条目服务环境.
 */
interface EntryServiceFixture {
  /**
   * 被测的条目服务.
   */
  readonly entries: EntryService;
  /**
   * 假剪贴板写入方法的间谍.
   */
  readonly writeText: ReturnType<typeof vi.fn<(text: string) => void>>;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 在保险库服务之上创建条目服务, 编号依次为 id-1, id-2, 时间依次递增.
 * @param vault 保险库服务.
 * @param getOrm 覆盖取数据库的方法, 默认取保险库服务的数据库.
 * @returns 条目服务环境.
 */
export function createEntryServiceFixture(
  vault: VaultService,
  getOrm: () => VaultOrm | undefined = () => vault.getOrm(),
): EntryServiceFixture {
  const writeText = vi.fn<(text: string) => void>();
  const clipboard: ClipboardPort = { writeText };
  const failures: unknown[] = [];
  let counter = 0;
  const entries = new EntryService({
    getOrm,
    clipboard,
    createIdentifier: () => `id-${(counter += 1)}`,
    now: () => 1000 + counter,
    onFailure: (error) => failures.push(error),
  });
  return { entries, writeText, failures };
}

/**
 * 用主密码完成首次设置并解锁, 返回已解锁的保险库服务.
 * @param harness 保险库服务测试环境.
 * @returns 已解锁的保险库服务.
 */
async function unlockedVault(
  harness: VaultServiceHarness,
): Promise<VaultService> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return vault;
}

describe("条目服务: 未解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("全部操作都因保险库未解锁而失败", async () => {
    const vault = await startService(getHarness());
    const { entries } = createEntryServiceFixture(vault);
    const input = { name: "n", account: "a", password: "p" };

    expect(entries.list()).toEqual({ ok: false, reason: "vault-locked" });
    expect(entries.get("id-1")).toEqual({ ok: false, reason: "vault-locked" });
    expect(entries.create(input)).toEqual({
      ok: false,
      reason: "vault-locked",
    });
    expect(entries.copyField("id-1", "account")).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });
});

describe("条目服务: 新建与读取", () => {
  const getHarness = useVaultServiceHarness();

  it("新建的条目带编号, 出现在列表最前, 详情含密码", async () => {
    const { entries } = createEntryServiceFixture(
      await unlockedVault(getHarness()),
    );

    const first = entries.create({
      name: "论坛",
      account: "a1",
      password: "p1",
    });
    const second = entries.create({
      name: "银行",
      account: "a2",
      password: "p2",
    });

    expect(first).toEqual({
      ok: true,
      value: { id: "id-1", name: "论坛", account: "a1", password: "p1" },
    });
    expect(entries.list()).toEqual({
      ok: true,
      value: [
        { id: "id-2", name: "银行", account: "a2" },
        { id: "id-1", name: "论坛", account: "a1" },
      ],
    });
    expect(second.ok && entries.get(second.value.id)).toEqual(second);
  });

  it("读取不存在的编号返回未找到", async () => {
    const { entries } = createEntryServiceFixture(
      await unlockedVault(getHarness()),
    );

    expect(entries.get("missing")).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("条目服务: 输入校验", () => {
  const getHarness = useVaultServiceHarness();

  it("名称去首尾空格, 账号与密码可以为空", async () => {
    const { entries } = createEntryServiceFixture(
      await unlockedVault(getHarness()),
    );

    const result = entries.create({
      name: "  名称  ",
      account: "",
      password: "",
    });

    expect(result).toEqual({
      ok: true,
      value: { id: "id-1", name: "名称", account: "", password: "" },
    });
  });

  it("名称为空或超长时被拒绝且不写入", async () => {
    const { entries } = createEntryServiceFixture(
      await unlockedVault(getHarness()),
    );

    const empty = entries.create({ name: "  ", account: "a", password: "p" });
    const tooLong = entries.create({
      name: "n".repeat(101),
      account: "a",
      password: "p",
    });

    expect(empty).toEqual({ ok: false, reason: "invalid-input" });
    expect(tooLong).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.list()).toEqual({ ok: true, value: [] });
  });
});

describe("条目服务: 复制", () => {
  const getHarness = useVaultServiceHarness();

  it("把账号或密码写入剪贴板", async () => {
    const { entries, writeText } = createEntryServiceFixture(
      await unlockedVault(getHarness()),
    );
    entries.create({
      name: "论坛",
      account: "the-account",
      password: "the-pw",
    });

    const copiedAccount = entries.copyField("id-1", "account");
    const copiedPassword = entries.copyField("id-1", "password");

    expect(copiedAccount).toEqual({ ok: true, value: undefined });
    expect(copiedPassword).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenNthCalledWith(1, "the-account");
    expect(writeText).toHaveBeenNthCalledWith(2, "the-pw");
  });

  it("编号不存在时不写剪贴板", async () => {
    const { entries, writeText } = createEntryServiceFixture(
      await unlockedVault(getHarness()),
    );

    const result = entries.copyField("missing", "password");

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("条目服务: 持久化与意外错误", () => {
  const getHarness = useVaultServiceHarness();

  it("关闭重开并解锁后条目仍在", async () => {
    const harness = getHarness();
    const first = await unlockedVault(harness);
    createEntryServiceFixture(first).entries.create({
      name: "论坛",
      account: "a",
      password: "p",
    });
    first.close();

    const second = await startService(harness);
    await second.unlock(TEST_MASTER_PASSWORD);
    const detail = createEntryServiceFixture(second).entries.get("id-1");

    expect(detail).toEqual({
      ok: true,
      value: { id: "id-1", name: "论坛", account: "a", password: "p" },
    });
  });

  it("数据库抛出错误时通知回调并返回意外错误", async () => {
    const vault = await unlockedVault(getHarness());
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

  it("数据库文件里搜不到账号与密码的原始, 十六进制与 base64 形式", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const vault = await startService(harness);
    await vault.unlock(TEST_MASTER_PASSWORD);
    const detail: EntryDetail = {
      id: "id-1",
      name: "disk-plaintext-name",
      account: "disk-plaintext-account",
      password: "disk-plaintext-password",
    };
    createEntryServiceFixture(vault).entries.create(detail);
    vault.close();

    const content = await readFile(harness.paths.databaseFile);

    for (const secret of [detail.name, detail.account, detail.password]) {
      expect(content.includes(Buffer.from(secret))).toBe(false);
      expect(content.includes(Buffer.from(secret).toString("hex"))).toBe(false);
      expect(content.includes(Buffer.from(secret).toString("base64"))).toBe(
        false,
      );
    }
  });
});
