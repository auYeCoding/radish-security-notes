import { beforeEach, describe, expect, it, vi } from "vitest";

import { isZeroed } from "../testing/master-password-switch-rig";
import {
  readRecoveryProbe,
  startUnlockedProbeService,
} from "../testing/recovery-vault-fixtures";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import type {
  OpenVaultDatabaseOptions,
  VaultDatabase,
} from "./database/open-vault-database";

/**
 * 间谍记录: 打开数据库时收到的数据密钥缓冲区, 连接被关闭的次数, 以及关闭时是否要抛错.
 */
const spy = vi.hoisted(() => ({
  openedKeys: [] as Buffer[],
  closeCount: 0,
  shouldCloseThrow: false,
}));

/**
 * 原样打开数据库的函数类型.
 */
type OpenVaultDatabase = (options: OpenVaultDatabaseOptions) => VaultDatabase;

/**
 * 包装真实的打开函数: 记下收到的数据密钥缓冲区, 并让返回的连接在关闭时计数, 按需抛错.
 * @param open 真实的打开函数.
 * @returns 带间谍的打开函数.
 */
function spyOnOpen(open: OpenVaultDatabase): OpenVaultDatabase {
  return (options) => {
    spy.openedKeys.push(options.dataKey);
    const database = open(options);
    return {
      orm: database.orm,
      close: () => {
        database.close();
        spy.closeCount += 1;
        if (spy.shouldCloseThrow) {
          throw new Error("关闭连接失败");
        }
      },
    };
  };
}

/**
 * 被替换的打开数据库模块里用到的导出.
 */
interface OpenVaultDatabaseModule {
  /**
   * 打开保险库数据库.
   */
  readonly openVaultDatabase: OpenVaultDatabase;
}

vi.mock("./database/open-vault-database", async (importOriginal) => {
  const original = await importOriginal<OpenVaultDatabaseModule>();
  return {
    ...original,
    openVaultDatabase: spyOnOpen(original.openVaultDatabase),
  };
});

beforeEach(() => {
  spy.openedKeys.length = 0;
  spy.closeCount = 0;
  spy.shouldCloseThrow = false;
});

describe("VaultService 锁定与数据密钥缓冲区", () => {
  const getHarness = useVaultServiceHarness();

  it("解锁时传给数据库的数据密钥缓冲区在打开后立即清零", async () => {
    await startUnlockedProbeService(getHarness(), "master-password");

    const lastKey = spy.openedKeys.at(-1);
    expect(lastKey).toHaveLength(32);
    expect(lastKey && isZeroed(lastKey)).toBe(true);
  });

  it("锁定后连接恰好关闭一次, 所有打开过的缓冲区仍是全零", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );
    const closedBefore = spy.closeCount;

    await service.lock();

    expect(spy.closeCount - closedBefore).toBe(1);
    expect(spy.openedKeys.length).toBeGreaterThan(0);
    expect(spy.openedKeys.every(isZeroed)).toBe(true);
  });

  it("重新解锁用新的缓冲区, 同样在打开后清零", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );
    const openedBefore = spy.openedKeys.length;
    await service.lock();

    await service.unlock(TEST_MASTER_PASSWORD);

    expect(spy.openedKeys.length - openedBefore).toBe(1);
    expect(spy.openedKeys.every(isZeroed)).toBe(true);
  });
});

describe("VaultService 锁定时关闭连接失败", () => {
  const getHarness = useVaultServiceHarness();

  it("关闭连接抛错时仍进入已锁定, 丢弃引用, 不写失败回调, 之后可以重新解锁", async () => {
    const harness = getHarness();
    const service = await startUnlockedProbeService(harness, "master-password");
    spy.shouldCloseThrow = true;

    const result = await service.lock();

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("locked");
    expect(service.getOrm()).toBeUndefined();
    expect(harness.failures).toEqual([]);
    spy.shouldCloseThrow = false;
    expect(await service.unlock(TEST_MASTER_PASSWORD)).toEqual({ ok: true });
    expect(readRecoveryProbe(service)).toEqual([
      { value: "kept-after-recovery" },
    ]);
  });
});
