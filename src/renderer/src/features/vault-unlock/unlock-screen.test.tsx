import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createVaultTestEnvironment,
  type VaultTestEnvironment,
  type VaultTestEnvironmentOptions,
} from "@renderer/testing/vault-test-environment";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";

import { UnlockScreen } from "./unlock-screen";

/**
 * 在保险库环境里渲染解锁页.
 * @param options 保险库测试环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderUnlock(
  options: VaultTestEnvironmentOptions = {},
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "locked",
    ...options,
  });
  render(<UnlockScreen />, { wrapper: environment.Providers });
  return environment;
}

/**
 * 输入主密码并点击 "解锁".
 * @param password 主密码.
 */
async function enterPasswordAndUnlock(password: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("主密码"), password);
  await user.click(screen.getByRole("button", { name: "解锁" }));
}

describe("UnlockScreen 内容", () => {
  it("显示标题, 说明, 主密码输入框与解锁按钮", async () => {
    await renderUnlock();

    expect(screen.getByRole("heading", { name: "解锁" })).toBeDefined();
    expect(screen.getByText("输入主密码以打开数据.")).toBeDefined();
    expect(screen.getByLabelText("主密码")).toBeDefined();
    expect(screen.getByRole("button", { name: "解锁" })).toBeDefined();
  });

  it("页面出现时主密码输入框自动获得焦点", async () => {
    await renderUnlock();

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("主密码"));
    });
  });
});

describe("UnlockScreen 解锁", () => {
  it("正确的主密码交给桥, 保险库状态变为 unlocked", async () => {
    const { vaultBridge, vaultStore } = await renderUnlock();

    await enterPasswordAndUnlock("correct password");

    await waitFor(() => {
      expect(vaultStore.getState().status).toBe("unlocked");
    });
    expect(vaultBridge.unlock).toHaveBeenCalledWith("correct password");
  });

  it("主密码不对时在输入框下方提示并标红, 状态保持 locked", async () => {
    const { vaultStore } = await renderUnlock({
      bridgeOverrides: {
        unlock: () => Promise.resolve({ ok: false, reason: "wrong-password" }),
      },
    });

    await enterPasswordAndUnlock("wrong password");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("主密码不正确, 请重新输入.");
    expect(screen.getByLabelText("主密码").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(vaultStore.getState().status).toBe("locked");
  });
});

describe("UnlockScreen 其它失败与处理中", () => {
  it("意外失败时在顶部提示条显示, 输入框不标红", async () => {
    await renderUnlock({
      bridgeOverrides: {
        unlock: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });

    await enterPasswordAndUnlock("anything");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("解锁失败. 请关闭应用后重试.");
    expect(screen.getByLabelText("主密码").getAttribute("aria-invalid")).toBe(
      "false",
    );
  });

  it("解锁进行中按钮被禁用并显示处理中的文案", async () => {
    let finish: (result: VaultOperationResult) => void = () => undefined;
    await renderUnlock({
      bridgeOverrides: {
        unlock: () =>
          new Promise<VaultOperationResult>((resolve) => {
            finish = resolve;
          }),
      },
    });

    await enterPasswordAndUnlock("anything");

    const pendingButton = await screen.findByRole("button", {
      name: "正在解锁...",
    });
    expect(pendingButton.hasAttribute("disabled")).toBe(true);
    finish({ ok: true });
  });
});
