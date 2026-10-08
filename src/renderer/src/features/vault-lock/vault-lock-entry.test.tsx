import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultFailureReason,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";
import { createDeferred } from "@renderer/testing/create-deferred";
import {
  createVaultTestEnvironment,
  type VaultTestEnvironment,
} from "@renderer/testing/vault-test-environment";

import { VaultLockEntry } from "./vault-lock-entry";

/**
 * 在已解锁的保险库环境里渲染锁定入口.
 * @param lock 假保险库桥的锁定方法, 不给时锁定成功.
 * @param isMasterPasswordMissing 是否因为没设主密码而不可用.
 * @returns 渲染所用的环境.
 */
async function renderEntry(
  lock?: () => Promise<VaultOperationResult>,
  isMasterPasswordMissing = false,
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "unlocked",
    bridgeOverrides: lock === undefined ? {} : { lock },
  });
  render(<VaultLockEntry isMasterPasswordMissing={isMasterPasswordMissing} />, {
    wrapper: environment.Providers,
  });
  return environment;
}

/**
 * 生成一个以指定原因失败的假锁定方法.
 * @param reason 失败原因.
 * @returns 假锁定方法.
 */
function failingWith(
  reason: VaultFailureReason,
): () => Promise<VaultOperationResult> {
  return vi.fn(() => Promise.resolve(vaultOperationFailed(reason)));
}

describe("锁定入口: 锁定成功", () => {
  it("点击后请求主进程锁定, 保险库状态变为已锁定, 没有提示框", async () => {
    const environment = await renderEntry();

    await userEvent.setup().click(screen.getByRole("button", { name: "锁定" }));

    await waitFor(() =>
      expect(environment.vaultStore.getState().status).toBe("locked"),
    );
    expect(environment.vaultBridge.lock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("锁定入口: 被拒绝", () => {
  it("有任务进行中: 弹出提示框说明原因, 保险库保持解锁, 点 知道了 关闭", async () => {
    const environment = await renderEntry(failingWith("tasks-running"));
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "锁定" }));

    const dialog = await screen.findByRole("alertdialog", { name: "无法锁定" });
    expect(dialog.textContent).toContain(
      "导入, 导出, 邮箱备份或恢复正在进行. 请等它结束, 或先取消, 再锁定.",
    );
    expect(environment.vaultStore.getState().status).toBe("unlocked");
    await user.click(screen.getByRole("button", { name: "知道了" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.vaultStore.getState().status).toBe("unlocked");
  });

  it("未设主密码: 提示开启主密码后即可锁定", async () => {
    await renderEntry(failingWith("master-password-required"));

    await userEvent.setup().click(screen.getByRole("button", { name: "锁定" }));

    const dialog = await screen.findByRole("alertdialog", { name: "无法锁定" });
    expect(dialog.textContent).toContain("开启主密码后即可锁定");
  });

  it("状态不符且主进程里仍是已解锁: 提示稍后再试, 保险库保持解锁", async () => {
    const environment = await renderEntry(failingWith("unexpected-state"));

    await userEvent.setup().click(screen.getByRole("button", { name: "锁定" }));

    const dialog = await screen.findByRole("alertdialog", { name: "无法锁定" });
    expect(dialog.textContent).toContain("保险库正在处理其它操作");
    expect(environment.vaultStore.getState().status).toBe("unlocked");
  });

  it("关闭提示框后可以再次尝试锁定", async () => {
    const lock = vi
      .fn<() => Promise<VaultOperationResult>>()
      .mockResolvedValueOnce(vaultOperationFailed("tasks-running"))
      .mockResolvedValue(VAULT_OPERATION_SUCCEEDED);
    const environment = await renderEntry(lock);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "锁定" }));
    await user.click(await screen.findByRole("button", { name: "知道了" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "锁定" }));

    await waitFor(() =>
      expect(environment.vaultStore.getState().status).toBe("locked"),
    );
    expect(lock).toHaveBeenCalledTimes(2);
  });
});

describe("锁定入口: 请求进行中与不可用", () => {
  it("锁定请求还没返回时再点击不会发出第二次请求", async () => {
    const pending = createDeferred<VaultOperationResult>();
    const lock = vi.fn(() => pending.promise);
    const environment = await renderEntry(lock);
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: "锁定" });

    await user.click(button);
    await user.click(button);
    pending.resolve(VAULT_OPERATION_SUCCEEDED);

    await waitFor(() =>
      expect(environment.vaultStore.getState().status).toBe("locked"),
    );
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it("没设主密码时按钮不可用, 点击不请求主进程", async () => {
    const environment = await renderEntry(undefined, true);

    await userEvent.setup().click(screen.getByRole("button", { name: "锁定" }));

    expect(environment.vaultBridge.lock).not.toHaveBeenCalled();
    expect(environment.vaultStore.getState().status).toBe("unlocked");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
