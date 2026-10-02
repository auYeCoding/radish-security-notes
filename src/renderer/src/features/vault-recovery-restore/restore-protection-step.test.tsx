import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  TEST_RECOVERY_WORDS,
  createVaultTestEnvironment,
  type VaultTestEnvironment,
  type VaultTestEnvironmentOptions,
} from "@renderer/testing/vault-test-environment";

import { RestoreProtectionStep } from "./restore-protection-step";

/**
 * 在保险库环境里渲染恢复后设置新保护的步骤.
 * @param options 保险库测试环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderProtectionStep(
  options: VaultTestEnvironmentOptions = {},
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "locked",
    ...options,
  });
  render(<RestoreProtectionStep words={TEST_RECOVERY_WORDS} />, {
    wrapper: environment.Providers,
  });
  return environment;
}

/**
 * 在两个密码输入框里输入内容并点击 "设置并解锁".
 * @param password 主密码.
 * @param confirmation 确认输入.
 */
async function submitPasswords(
  password: string,
  confirmation: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("主密码"), password);
  await user.type(screen.getByLabelText("确认主密码"), confirmation);
  await user.click(screen.getByRole("button", { name: "设置并解锁" }));
}

describe("RestoreProtectionStep 设置新主密码", () => {
  it("显示标题与两个按钮, 不要求 我已了解 勾选", async () => {
    await renderProtectionStep();

    expect(screen.getByRole("heading", { name: "设置新的保护" })).toBeDefined();
    expect(screen.getByRole("button", { name: "设置并解锁" })).toBeDefined();
    expect(screen.getByRole("button", { name: "跳过主密码" })).toBeDefined();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("主密码太短或两次不一致时提示, 不调用桥", async () => {
    const { recoveryBridge } = await renderProtectionStep();

    await submitPasswords("short", "different");

    expect(await screen.findByText("主密码至少需要 8 个字符.")).toBeDefined();
    expect(screen.getByText("两次输入的主密码不一致.")).toBeDefined();
    expect(recoveryBridge.restoreWithMasterPassword).not.toHaveBeenCalled();
  });

  it("校验通过后把词与新主密码交给桥, 状态变为 unlocked, 不产生新的恢复词", async () => {
    const { recoveryBridge, vaultStore } = await renderProtectionStep();

    await submitPasswords("new long password", "new long password");

    await waitFor(() => {
      expect(vaultStore.getState().status).toBe("unlocked");
    });
    expect(recoveryBridge.restoreWithMasterPassword).toHaveBeenCalledWith(
      TEST_RECOVERY_WORDS,
      "new long password",
    );
    expect(vaultStore.getState().pendingRecoveryWords).toBeUndefined();
  });

  it("桥报告失败时在顶部提示条显示", async () => {
    await renderProtectionStep({
      recoveryBridgeOverrides: {
        restoreWithMasterPassword: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });

    await submitPasswords("new long password", "new long password");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "恢复失败. 请关闭应用后重试.",
    );
  });
});

describe("RestoreProtectionStep 跳过主密码", () => {
  it("点击跳过先弹出确认框, 确认后用词改用系统保护", async () => {
    const { recoveryBridge, vaultStore } = await renderProtectionStep();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "跳过主密码" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(recoveryBridge.restoreWithoutMasterPassword).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "跳过" }));

    await waitFor(() => {
      expect(vaultStore.getState().status).toBe("unlocked");
    });
    expect(recoveryBridge.restoreWithoutMasterPassword).toHaveBeenCalledWith(
      TEST_RECOVERY_WORDS,
    );
  });

  it("系统不能保护数据密钥时关闭确认框并提示", async () => {
    await renderProtectionStep({
      recoveryBridgeOverrides: {
        restoreWithoutMasterPassword: () =>
          Promise.resolve({
            ok: false,
            reason: "system-protection-unavailable",
          }),
      },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "跳过主密码" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    await user.click(dialog.getByRole("button", { name: "跳过" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect((await screen.findByRole("alert")).textContent).toBe(
      "系统无法保护数据密钥. 请设置主密码.",
    );
  });
});
