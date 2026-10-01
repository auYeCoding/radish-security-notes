import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createVaultTestEnvironment,
  type VaultTestEnvironment,
  type VaultTestEnvironmentOptions,
} from "@renderer/testing/vault-test-environment";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";

import { OnboardingScreen } from "./onboarding-screen";

/**
 * 在保险库环境里渲染引导页, 并点击 "跳过" 打开确认框.
 * @param options 保险库测试环境的选项.
 * @returns 渲染所用的环境.
 */
async function openSkipDialog(
  options: VaultTestEnvironmentOptions = {},
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "needs-setup",
    ...options,
  });
  render(<OnboardingScreen />, { wrapper: environment.Providers });
  await userEvent.setup().click(screen.getByRole("button", { name: "跳过" }));
  return environment;
}

/**
 * 取得打开的确认框.
 * @returns 确认框内的查询工具.
 */
async function findDialog(): Promise<ReturnType<typeof within>> {
  return within(await screen.findByRole("alertdialog"));
}

describe("OnboardingScreen 跳过确认框", () => {
  it("点击跳过后先弹出确认框并写明风险, 不立即调用桥", async () => {
    const { vaultBridge } = await openSkipDialog();

    const dialog = await findDialog();

    expect(dialog.getByText("跳过主密码?")).toBeDefined();
    expect(
      dialog.getByText(
        "数据仍加密保存, 但能登录此 Windows 账户的人可直接打开应用.",
      ),
    ).toBeDefined();
    expect(vaultBridge.setupWithoutMasterPassword).not.toHaveBeenCalled();
  });

  it("点击取消关闭确认框, 不调用桥", async () => {
    const { vaultBridge } = await openSkipDialog();
    const dialog = await findDialog();

    await userEvent.setup().click(dialog.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(vaultBridge.setupWithoutMasterPassword).not.toHaveBeenCalled();
  });
});

describe("OnboardingScreen 跳过进行中", () => {
  it("等待系统密钥落盘期间确认按钮显示处理中并被禁用, 确认框不能被关闭", async () => {
    let finish: (result: VaultOperationResult) => void = () => undefined;
    await openSkipDialog({
      bridgeOverrides: {
        setupWithoutMasterPassword: () =>
          new Promise<VaultOperationResult>((resolve) => {
            finish = resolve;
          }),
      },
    });
    const dialog = await findDialog();
    const user = userEvent.setup();

    await user.click(dialog.getByRole("button", { name: "跳过" }));

    const pending = await dialog.findByRole("button", { name: "正在设置..." });
    expect(pending.hasAttribute("disabled")).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeNull();
    finish({ ok: true });
  });
});

describe("OnboardingScreen 确认跳过", () => {
  it("确认后调用桥, 保险库状态变为 unlocked", async () => {
    const { vaultBridge, vaultStore } = await openSkipDialog();
    const dialog = await findDialog();

    await userEvent.setup().click(dialog.getByRole("button", { name: "跳过" }));

    await waitFor(() => {
      expect(vaultStore.getState().status).toBe("unlocked");
    });
    expect(vaultBridge.setupWithoutMasterPassword).toHaveBeenCalledTimes(1);
  });

  it("系统不能保护数据密钥时关闭确认框并在顶部提示条说明", async () => {
    await openSkipDialog({
      bridgeOverrides: {
        setupWithoutMasterPassword: () =>
          Promise.resolve({
            ok: false,
            reason: "system-protection-unavailable",
          }),
      },
    });
    const dialog = await findDialog();

    await userEvent.setup().click(dialog.getByRole("button", { name: "跳过" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "系统无法保护数据密钥, 无法跳过. 请设置主密码.",
    );
  });
});
