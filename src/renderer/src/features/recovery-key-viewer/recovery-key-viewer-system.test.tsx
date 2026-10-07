import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { vaultOperationFailed } from "@shared/vault/vault-operation-result";
import {
  openRecoveryKeyVerifyWith,
  submitRecoveryKeyVerification,
} from "@renderer/testing/open-recovery-key-dialog";
import { createFakeMasterPasswordBridge } from "@renderer/testing/fake-master-password-bridge";

import { RecoveryKeyViewer } from "./recovery-key-viewer";

/**
 * 在由系统保护的环境里渲染入口并点开验证对话框.
 * @returns 条目环境.
 */
function openSystemVerify(): ReturnType<typeof openRecoveryKeyVerifyWith> {
  return openRecoveryKeyVerifyWith(() => <RecoveryKeyViewer />, {
    hasMasterPassword: false,
  });
}

describe("查看恢复密钥: 由系统保护时验证", () => {
  it("验证对话框要求勾选确认周围没有他人查看, 没有主密码输入框", async () => {
    await openSystemVerify();

    expect(
      await screen.findByRole("checkbox", {
        name: "我已确认周围没有他人查看",
      }),
    ).toBeDefined();
    expect(screen.queryByLabelText("当前主密码")).toBeNull();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
  });

  it("没勾选就提交时提示并且不请求主进程", async () => {
    const user = userEvent.setup();
    const environment = await openSystemVerify();
    await screen.findByRole("checkbox", { name: "我已确认周围没有他人查看" });

    await user.click(screen.getByRole("button", { name: "查看" }));

    expect(await screen.findByText("请先确认周围没有他人查看.")).toBeDefined();
    expect(environment.recoveryBridge.viewKey).not.toHaveBeenCalled();
  });

  it("勾选后提交, 不带主密码向主进程取词并显示 24 个词", async () => {
    const user = userEvent.setup();
    const environment = await openSystemVerify();

    await submitRecoveryKeyVerification(user);

    expect(
      await screen.findByRole("list", { name: "24 个恢复词" }),
    ).toBeDefined();
    expect(environment.recoveryBridge.viewKey).toHaveBeenCalledWith(undefined);
  });
});

describe("查看恢复密钥: 主密码状态与模式不符", () => {
  it("主进程按状态不符拒绝时提示重新确认, 不显示词, 保险库状态不变", async () => {
    const user = userEvent.setup();
    const environment = await openRecoveryKeyVerifyWith(
      () => <RecoveryKeyViewer />,
      {
        hasMasterPassword: false,
        recoveryBridgeOverrides: {
          viewKey: vi.fn(() =>
            Promise.resolve(vaultOperationFailed("unexpected-state")),
          ),
        },
      },
    );

    await submitRecoveryKeyVerification(user);

    expect(
      await screen.findByText(
        "当前状态不允许这次操作. 请关闭对话框, 确认主密码设置后重试.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
    expect(environment.vaultStore.getState().status).toBe("unlocked");
  });

  it("读不到主密码状态时提示并给出重试, 重试成功后按读到的模式验证", async () => {
    const user = userEvent.setup();
    const hasMasterPassword = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValueOnce(new Error("读取失败"))
      .mockResolvedValue(true);
    await openRecoveryKeyVerifyWith(() => <RecoveryKeyViewer />, {
      masterPasswordBridgeOverrides: {
        ...createFakeMasterPasswordBridge(),
        hasMasterPassword,
      },
    });

    expect(
      await screen.findByText("无法读取主密码设置. 请点击重试."),
    ).toBeDefined();
    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByLabelText("当前主密码")).toBeDefined();
    expect(screen.queryByText("无法读取主密码设置. 请点击重试.")).toBeNull();
  });
});
