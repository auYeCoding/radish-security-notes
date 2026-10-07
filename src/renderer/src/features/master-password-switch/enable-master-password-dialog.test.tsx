import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { VaultOperationResult } from "@shared/vault/vault-operation-result";
import { createDeferred } from "@renderer/testing/create-deferred";
import type { EntryTestEnvironmentOptions } from "@renderer/testing/entry-test-environment";
import {
  renderInEntryEnvironment,
  type RenderedInEnvironment,
} from "@renderer/testing/render-in-entry-environment";

import { EnableMasterPasswordDialog } from "./enable-master-password-dialog";

/**
 * 合规的新主密码.
 */
const NEW_PASSWORD = "a long enough password";

/**
 * 渲染开启对话框拿到的结果.
 */
interface RenderedEnableDialog extends RenderedInEnvironment {
  /**
   * 对话框要关闭时被调用的间谍.
   */
  readonly onClose: () => void;
  /**
   * 开启成功时被调用的间谍.
   */
  readonly onSucceeded: () => void;
}

/**
 * 在条目环境里渲染开启主密码对话框.
 * @param options 条目环境的选项, 例如覆盖假桥的开启方法.
 * @returns 渲染结果与两个回调的间谍.
 */
async function renderEnableDialog(
  options: EntryTestEnvironmentOptions = {},
): Promise<RenderedEnableDialog> {
  const onClose = vi.fn();
  const onSucceeded = vi.fn();
  const rendered = await renderInEntryEnvironment(
    () => (
      <EnableMasterPasswordDialog onClose={onClose} onSucceeded={onSucceeded} />
    ),
    options,
  );
  return { ...rendered, onClose, onSucceeded };
}

/**
 * 在两个输入框里输入内容并点击提交.
 * @param password 新主密码.
 * @param confirmation 确认输入.
 */
async function submitPasswords(
  password: string,
  confirmation: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("主密码"), password);
  await user.type(screen.getByLabelText("确认主密码"), confirmation);
  await user.click(screen.getByRole("button", { name: "开启主密码" }));
}

describe("开启主密码对话框: 内容与校验", () => {
  it("有标题, 说明, 两个密码输入框与取消, 提交按钮", async () => {
    await renderEnableDialog();

    const dialog = within(
      await screen.findByRole("dialog", { name: "开启主密码" }),
    );
    expect(
      dialog.getByText(
        "开启后, 下次启动应用要输入主密码才能打开数据. 当前不需要重新解锁.",
      ),
    ).toBeDefined();
    expect(dialog.getByLabelText("主密码")).toBeDefined();
    expect(dialog.getByLabelText("确认主密码")).toBeDefined();
    expect(dialog.getByRole("button", { name: "取消" })).toBeDefined();
    expect(dialog.getByRole("button", { name: "开启主密码" })).toBeDefined();
  });

  it("主密码太短或两次不一致时在字段下提示, 不调用桥", async () => {
    const { environment, onSucceeded } = await renderEnableDialog();

    await submitPasswords("short", "different");

    expect(await screen.findByText("主密码至少需要 8 个字符.")).toBeDefined();
    expect(screen.getByText("两次输入的主密码不一致.")).toBeDefined();
    expect(environment.masterPasswordBridge.enable).not.toHaveBeenCalled();
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it("只是两次不一致时也不调用桥", async () => {
    const { environment } = await renderEnableDialog();

    await submitPasswords(NEW_PASSWORD, `${NEW_PASSWORD} again`);

    expect(await screen.findByText("两次输入的主密码不一致.")).toBeDefined();
    expect(environment.masterPasswordBridge.enable).not.toHaveBeenCalled();
  });
});

describe("开启主密码对话框: 提交", () => {
  it("校验通过后把新主密码交给桥, 成功后通知调用方", async () => {
    const { environment, onSucceeded } = await renderEnableDialog();

    await submitPasswords(NEW_PASSWORD, NEW_PASSWORD);

    await waitFor(() => expect(onSucceeded).toHaveBeenCalledTimes(1));
    expect(environment.masterPasswordBridge.enable).toHaveBeenCalledWith(
      NEW_PASSWORD,
    );
  });

  it("桥报告失败时在顶部提示条显示, 提示里没有主密码, 不通知成功", async () => {
    const { onSucceeded } = await renderEnableDialog({
      masterPasswordBridgeOverrides: {
        enable: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });

    await submitPasswords(NEW_PASSWORD, NEW_PASSWORD);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("操作失败, 主密码设置保持不变. 请稍后重试.");
    expect(alert.textContent).not.toContain(NEW_PASSWORD);
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it("状态不符时提示先确认开关状态", async () => {
    await renderEnableDialog({
      masterPasswordBridgeOverrides: {
        enable: () =>
          Promise.resolve({ ok: false, reason: "unexpected-state" }),
      },
    });

    await submitPasswords(NEW_PASSWORD, NEW_PASSWORD);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "当前状态不允许这次操作. 请关闭对话框, 确认开关状态后重试.",
    );
  });
});

describe("开启主密码对话框: 执行中", () => {
  it("执行中提交按钮显示处理中并禁用, 取消按钮禁用, 按 Escape 不关闭", async () => {
    const pending = createDeferred<VaultOperationResult>();
    const { onClose, onSucceeded } = await renderEnableDialog({
      masterPasswordBridgeOverrides: { enable: () => pending.promise },
    });

    await submitPasswords(NEW_PASSWORD, NEW_PASSWORD);

    const submitting = await screen.findByRole("button", {
      name: "正在开启...",
    });
    expect((submitting as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "取消" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ ok: true }));
    await waitFor(() => expect(onSucceeded).toHaveBeenCalledTimes(1));
  });
});

describe("开启主密码对话框: 取消与英文界面", () => {
  it("点取消通知调用方关闭, 不调用桥", async () => {
    const { environment, onClose } = await renderEnableDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "取消" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(environment.masterPasswordBridge.enable).not.toHaveBeenCalled();
  });

  it("切到英文后标题, 说明与按钮都是英文", async () => {
    const { environment } = await renderEnableDialog();

    await act(() => environment.i18n.changeLanguage("en"));

    const dialog = within(
      await screen.findByRole("dialog", { name: "Turn on master password" }),
    );
    expect(
      dialog.getByText(
        "Once on, the master password is required to open your data the next time the app starts. You do not need to unlock again now.",
      ),
    ).toBeDefined();
    expect(dialog.getByRole("button", { name: "Cancel" })).toBeDefined();
    expect(
      dialog.getByRole("button", { name: "Turn on master password" }),
    ).toBeDefined();
  });
});
