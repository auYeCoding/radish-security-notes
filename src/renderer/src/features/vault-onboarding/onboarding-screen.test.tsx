import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  TEST_RECOVERY_WORDS,
  createVaultTestEnvironment,
  type VaultTestEnvironment,
  type VaultTestEnvironmentOptions,
} from "@renderer/testing/vault-test-environment";

import { OnboardingScreen } from "./onboarding-screen";

/**
 * 在保险库环境里渲染引导页.
 * @param options 保险库测试环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderOnboarding(
  options: VaultTestEnvironmentOptions = {},
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "needs-setup",
    ...options,
  });
  render(<OnboardingScreen />, { wrapper: environment.Providers });
  return environment;
}

/**
 * 在两个密码输入框里输入内容.
 * @param password 主密码.
 * @param confirmation 确认输入.
 */
async function typePasswords(
  password: string,
  confirmation: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("主密码"), password);
  await user.type(screen.getByLabelText("确认主密码"), confirmation);
}

/**
 * 勾选 "我已了解".
 */
async function acknowledge(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("checkbox", { name: "我已了解" }));
}

/**
 * 点击 "设置主密码" 按钮.
 */
async function submit(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "设置主密码" }));
}

describe("OnboardingScreen 内容", () => {
  it("显示标题, 说明, 字段说明, 遗忘提示与两个按钮", async () => {
    await renderOnboarding();

    expect(screen.getByRole("heading", { name: "设置主密码" })).toBeDefined();
    expect(
      screen.getByText("主密码用于在每次打开应用时解锁数据."),
    ).toBeDefined();
    expect(screen.getByText("至少 8 个字符, 建议 12 个以上")).toBeDefined();
    expect(
      screen.getByText(
        "主密码不会保存. 忘记后只能用接下来展示的 24 个恢复词找回数据, 请务必保管好.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "设置主密码" })).toBeDefined();
    expect(screen.getByRole("button", { name: "跳过" })).toBeDefined();
  });
});

describe("OnboardingScreen 校验", () => {
  it("主密码太短时在字段下方提示, 不调用桥", async () => {
    const { vaultBridge } = await renderOnboarding();
    await typePasswords("short", "short");
    await acknowledge();

    await submit();

    expect(await screen.findByText("主密码至少需要 8 个字符.")).toBeDefined();
    expect(vaultBridge.setupWithMasterPassword).not.toHaveBeenCalled();
  });

  it("两次输入不一致时提示, 不调用桥", async () => {
    const { vaultBridge } = await renderOnboarding();
    await typePasswords("long enough 1", "long enough 2");
    await acknowledge();

    await submit();

    expect(await screen.findByText("两次输入的主密码不一致.")).toBeDefined();
    expect(vaultBridge.setupWithMasterPassword).not.toHaveBeenCalled();
  });

  it("没有勾选 我已了解 时提示, 不调用桥", async () => {
    const { vaultBridge } = await renderOnboarding();
    await typePasswords("long enough 1", "long enough 1");

    await submit();

    expect(
      await screen.findByText("请先确认已了解忘记主密码需用恢复词找回."),
    ).toBeDefined();
    expect(vaultBridge.setupWithMasterPassword).not.toHaveBeenCalled();
  });
});

describe("OnboardingScreen 设置主密码", () => {
  it("校验通过后把主密码交给桥, 保险库状态变为 unlocked 并记下待确认的恢复词", async () => {
    const { vaultBridge, vaultStore } = await renderOnboarding();
    await typePasswords("long enough 1", "long enough 1");
    await acknowledge();

    await submit();

    await waitFor(() => {
      expect(vaultStore.getState().status).toBe("unlocked");
    });
    expect(vaultStore.getState().pendingRecoveryWords).toEqual(
      TEST_RECOVERY_WORDS,
    );
    expect(vaultBridge.setupWithMasterPassword).toHaveBeenCalledWith(
      "long enough 1",
    );
  });

  it("主进程报告意外失败时在顶部提示条显示", async () => {
    await renderOnboarding({
      bridgeOverrides: {
        setupWithMasterPassword: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });
    await typePasswords("long enough 1", "long enough 1");
    await acknowledge();

    await submit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("操作失败. 请关闭应用后重试.");
  });
});
