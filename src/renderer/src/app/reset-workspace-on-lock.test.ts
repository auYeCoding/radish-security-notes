import { describe, expect, it } from "vitest";

import { FORUM_ENTRY, TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import type { VaultStatus } from "@shared/vault/vault-status";

import { resetWorkspaceOnLock } from "./reset-workspace-on-lock";

/**
 * 挂上了锁定重置订阅的测试环境.
 */
interface SubscribedEnvironment {
  /**
   * 条目已读取并选中一个的测试环境.
   */
  readonly environment: EntryTestEnvironment;
  /**
   * 取消订阅的函数.
   */
  readonly unsubscribe: () => void;
}

/**
 * 创建指定状态的环境, 条目已读取并选中一个, 并挂上锁定重置的订阅.
 * @param status 保险库的初始状态.
 * @returns 环境与取消订阅的函数.
 */
async function createSubscribedEnvironment(
  status: VaultStatus,
): Promise<SubscribedEnvironment> {
  const environment = await createEntryTestEnvironment({
    status,
    entries: TEST_ENTRIES,
  });
  await environment.entryStore.getState().load();
  await environment.entryStore.getState().select(FORUM_ENTRY.id);
  const unsubscribe = resetWorkspaceOnLock(environment.vaultStore, environment);
  return { environment, unsubscribe };
}

describe("resetWorkspaceOnLock", () => {
  it("锁定成功的那一刻同步重置工作区 store", async () => {
    const { environment } = await createSubscribedEnvironment("unlocked");

    await environment.vaultStore.getState().lock();

    expect(environment.vaultStore.getState().status).toBe("locked");
    expect(environment.entryStore.getState().entries).toEqual([]);
    expect(environment.entryStore.getState().selection).toEqual({
      status: "none",
    });
  });

  it("被拒绝的锁定不重置, 数据还在", async () => {
    const { environment } = await createSubscribedEnvironment("unlocked");
    environment.vaultBridge.lock = () =>
      Promise.resolve({ ok: false, reason: "tasks-running" });

    await environment.vaultStore.getState().lock();

    expect(environment.vaultStore.getState().status).toBe("unlocked");
    expect(environment.entryStore.getState().entries.length).toBeGreaterThan(0);
  });

  it("保险库意外失败 (unlocked 变为 failed) 时同样重置", async () => {
    const { environment } = await createSubscribedEnvironment("unlocked");
    environment.vaultBridge.lock = () =>
      Promise.resolve({ ok: false, reason: "unexpected-error" });

    await environment.vaultStore.getState().lock();

    expect(environment.vaultStore.getState().status).toBe("failed");
    expect(environment.entryStore.getState().entries).toEqual([]);
  });

  it("保险库本来就不是 unlocked 时状态变化不触发重置", async () => {
    const { environment } = await createSubscribedEnvironment("locked");

    environment.vaultStore.setState({ status: "failed" });
    environment.vaultStore.setState({ status: "needs-setup" });

    expect(environment.entryStore.getState().entries.length).toBeGreaterThan(0);
  });

  it("取消订阅之后锁定不再重置", async () => {
    const { environment, unsubscribe } =
      await createSubscribedEnvironment("unlocked");
    unsubscribe();

    await environment.vaultStore.getState().lock();

    expect(environment.entryStore.getState().entries.length).toBeGreaterThan(0);
  });
});
