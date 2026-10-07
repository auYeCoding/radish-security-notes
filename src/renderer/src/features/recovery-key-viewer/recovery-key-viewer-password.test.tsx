import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RecoveryBridge } from "@shared/vault/recovery-bridge";
import { vaultOperationFailed } from "@shared/vault/vault-operation-result";
import {
  openRecoveryKeyVerifyWith,
  submitRecoveryKeyVerification,
} from "@renderer/testing/open-recovery-key-dialog";
import { TEST_RECOVERY_WORDS } from "@renderer/testing/vault-test-environment";

import { RecoveryKeyViewer } from "./recovery-key-viewer";

/**
 * 当前的主密码.
 */
const CURRENT_PASSWORD = "current master password";

/**
 * 只认当前主密码的假查看方法: 主密码对时给出恢复词, 不对时按主密码错误失败.
 * @param password 用户输入的主密码.
 * @returns 查看结果.
 */
const CHECKING_VIEW_KEY: RecoveryBridge["viewKey"] = (password) =>
  Promise.resolve(
    password === CURRENT_PASSWORD
      ? { ok: true as const, recoveryWords: TEST_RECOVERY_WORDS }
      : vaultOperationFailed("wrong-password"),
  );

/**
 * 在设了主密码的环境里渲染入口并点开验证对话框.
 * @param viewKey 假恢复桥的查看方法.
 * @returns 条目环境.
 */
function openPasswordVerify(
  viewKey: RecoveryBridge["viewKey"] = CHECKING_VIEW_KEY,
): ReturnType<typeof openRecoveryKeyVerifyWith> {
  return openRecoveryKeyVerifyWith(() => <RecoveryKeyViewer />, {
    hasMasterPassword: true,
    recoveryBridgeOverrides: { viewKey: vi.fn(viewKey) },
  });
}

describe("查看恢复密钥: 设了主密码时验证", () => {
  it("验证对话框要求输入当前主密码, 验证前页面上没有任何恢复词", async () => {
    await openPasswordVerify();

    const dialog = within(screen.getByRole("dialog", { name: "查看恢复密钥" }));
    expect(await dialog.findByLabelText("当前主密码")).toBeDefined();
    expect(
      dialog.getByText(
        "验证后显示 24 个恢复词. 内容与首次展示的相同, 泄露后无法更换.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
    expect(screen.queryByText("abandon")).toBeNull();
  });

  it("主密码正确时显示 24 个编号恢复词, 与首次展示的相同", async () => {
    const user = userEvent.setup();
    const environment = await openPasswordVerify();

    await submitRecoveryKeyVerification(user, CURRENT_PASSWORD);

    const grid = await screen.findByRole("list", { name: "24 个恢复词" });
    const items = within(grid).getAllByRole("listitem");
    expect(items).toHaveLength(24);
    expect(items[0]?.textContent).toBe("1.abandon");
    expect(items[23]?.textContent).toBe("24.actual");
    expect(environment.recoveryBridge.viewKey).toHaveBeenCalledWith(
      CURRENT_PASSWORD,
    );
  });

  it("没填主密码时提示并且不请求主进程", async () => {
    const user = userEvent.setup();
    const environment = await openPasswordVerify();
    await screen.findByLabelText("当前主密码");

    await user.click(screen.getByRole("button", { name: "查看" }));

    expect(await screen.findByText("请输入当前主密码.")).toBeDefined();
    expect(environment.recoveryBridge.viewKey).not.toHaveBeenCalled();
  });
});

describe("查看恢复密钥: 验证失败只在对话框内提示", () => {
  it("主密码错误时在输入框下提示, 不显示词, 对话框保留, 保险库状态不变", async () => {
    const user = userEvent.setup();
    const environment = await openPasswordVerify();

    await submitRecoveryKeyVerification(user, "wrong password");

    expect(await screen.findByText("主密码不正确, 请重新输入.")).toBeDefined();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "查看恢复密钥" })).toBeDefined();
    expect(environment.vaultStore.getState().status).toBe("unlocked");
  });

  it("读取失败时在顶部提示条里提示, 不显示词, 保险库状态不变", async () => {
    const user = userEvent.setup();
    const environment = await openPasswordVerify(() =>
      Promise.resolve(vaultOperationFailed("unexpected-error")),
    );

    await submitRecoveryKeyVerification(user, CURRENT_PASSWORD);

    const message = await screen.findByText(
      "读取失败, 保险库保持不变. 请稍后重试.",
    );
    expect(message.closest('[role="alert"]')).not.toBeNull();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
    expect(environment.vaultStore.getState().status).toBe("unlocked");
  });

  it("桥抛出错误时按意外失败提示, 保险库状态不变", async () => {
    const user = userEvent.setup();
    const environment = await openPasswordVerify(() =>
      Promise.reject(new Error("ipc 失败")),
    );

    await submitRecoveryKeyVerification(user, CURRENT_PASSWORD);

    expect(
      await screen.findByText("读取失败, 保险库保持不变. 请稍后重试."),
    ).toBeDefined();
    expect(environment.vaultStore.getState().status).toBe("unlocked");
  });
});
