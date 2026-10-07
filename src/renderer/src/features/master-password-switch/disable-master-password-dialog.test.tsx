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

import { DisableMasterPasswordDialog } from "./disable-master-password-dialog";

/**
 * 当前的主密码.
 */
const CURRENT_PASSWORD = "current master password";

/**
 * 渲染关闭对话框拿到的结果.
 */
interface RenderedDisableDialog extends RenderedInEnvironment {
  /**
   * 对话框要关闭时被调用的间谍.
   */
  readonly onClose: () => void;
  /**
   * 关闭成功时被调用的间谍.
   */
  readonly onSucceeded: () => void;
}

/**
 * 在条目环境里渲染关闭主密码对话框, 假桥初始设了主密码.
 * @param options 条目环境的选项, 例如覆盖假桥的关闭方法.
 * @returns 渲染结果与两个回调的间谍.
 */
async function renderDisableDialog(
  options: EntryTestEnvironmentOptions = {},
): Promise<RenderedDisableDialog> {
  const onClose = vi.fn();
  const onSucceeded = vi.fn();
  const rendered = await renderInEntryEnvironment(
    () => (
      <DisableMasterPasswordDialog
        onClose={onClose}
        onSucceeded={onSucceeded}
      />
    ),
    { hasMasterPassword: true, ...options },
  );
  return { ...rendered, onClose, onSucceeded };
}

/**
 * 填写当前主密码, 按需勾选已了解, 然后点击提交.
 * @param password 当前主密码, 空串表示不填.
 * @param isAcknowledged 是否勾选 "我了解关闭后的保护强度".
 */
async function submitDisable(
  password: string,
  isAcknowledged: boolean,
): Promise<void> {
  const user = userEvent.setup();
  if (password !== "") {
    await user.type(screen.getByLabelText("当前主密码"), password);
  }
  if (isAcknowledged) {
    await user.click(
      screen.getByRole("checkbox", { name: "我了解关闭后的保护强度" }),
    );
  }
  await user.click(screen.getByRole("button", { name: "关闭主密码" }));
}

/**
 * 等待一条失败提示出现并返回包住它的提示条. 对话框里的风险提示也是提示条, 所以按文字找.
 * @param message 失败提示的文字.
 * @returns 包住这条文字的提示条元素.
 * @throws Error 当这条文字不在提示条里时.
 */
async function findFailureAlert(message: string): Promise<HTMLElement> {
  const text = await screen.findByText(message);
  const alert = text.closest<HTMLElement>('[role="alert"]');
  if (alert === null) {
    throw new Error("失败提示应当显示在提示条里");
  }
  return alert;
}

describe("关闭主密码对话框: 内容", () => {
  it("有标题, 说明, 写明关闭后保护强度的风险提示, 当前主密码输入与勾选", async () => {
    await renderDisableDialog();

    const dialog = within(
      await screen.findByRole("dialog", { name: "关闭主密码" }),
    );
    expect(
      dialog.getByText("关闭后, 下次启动应用不再要求输入主密码."),
    ).toBeDefined();
    expect(dialog.getByText("关闭后保护会变弱")).toBeDefined();
    expect(
      dialog.getByText(
        "能登录本机这个 Windows 账户的人都能直接打开软件. 数据文件仍然加密, 但系统密钥失效 (重装系统, 重置 Windows 密码) 时, 只能靠恢复密钥找回数据, 请确认恢复密钥已妥善保管.",
      ),
    ).toBeDefined();
    expect(dialog.getByLabelText("当前主密码")).toBeDefined();
    expect(
      dialog.getByRole("checkbox", { name: "我了解关闭后的保护强度" }),
    ).toBeDefined();
  });

  it("勾选框默认没有勾选", async () => {
    await renderDisableDialog();

    const checkbox = await screen.findByRole("checkbox", {
      name: "我了解关闭后的保护强度",
    });

    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });
});

describe("关闭主密码对话框: 确认门槛", () => {
  it("没填当前主密码时提示, 不调用桥", async () => {
    const { environment } = await renderDisableDialog();

    await submitDisable("", true);

    expect(await screen.findByText("请输入当前主密码.")).toBeDefined();
    expect(environment.masterPasswordBridge.disable).not.toHaveBeenCalled();
  });

  it("没勾选已了解时提示, 不调用桥", async () => {
    const { environment } = await renderDisableDialog();

    await submitDisable(CURRENT_PASSWORD, false);

    expect(
      await screen.findByText("请先确认已了解关闭后的保护强度."),
    ).toBeDefined();
    expect(environment.masterPasswordBridge.disable).not.toHaveBeenCalled();
  });

  it("两项都没做时两处都提示", async () => {
    await renderDisableDialog();

    await submitDisable("", false);

    expect(await screen.findByText("请输入当前主密码.")).toBeDefined();
    expect(screen.getByText("请先确认已了解关闭后的保护强度.")).toBeDefined();
  });
});

describe("关闭主密码对话框: 提交", () => {
  it("输入当前主密码并勾选后把它交给桥, 成功后通知调用方", async () => {
    const { environment, onSucceeded } = await renderDisableDialog();

    await submitDisable(CURRENT_PASSWORD, true);

    await waitFor(() => expect(onSucceeded).toHaveBeenCalledTimes(1));
    expect(environment.masterPasswordBridge.disable).toHaveBeenCalledWith(
      CURRENT_PASSWORD,
    );
  });

  it("当前主密码错误时提示在输入框下方, 不出现顶部提示条, 不通知成功", async () => {
    const { onSucceeded } = await renderDisableDialog({
      masterPasswordBridgeOverrides: {
        disable: () => Promise.resolve({ ok: false, reason: "wrong-password" }),
      },
    });

    await submitDisable(CURRENT_PASSWORD, true);

    const message = await screen.findByText("主密码不正确, 请重新输入.");
    expect(message.getAttribute("data-slot")).toBe("field-error");
    expect(document.querySelectorAll('[data-slot="alert"]')).toHaveLength(1);
    expect(onSucceeded).not.toHaveBeenCalled();
  });
});

describe("关闭主密码对话框: 其它失败", () => {
  it("系统保护写不进去时在顶部提示条显示, 提示里没有主密码", async () => {
    const { onSucceeded } = await renderDisableDialog({
      masterPasswordBridgeOverrides: {
        disable: () =>
          Promise.resolve({
            ok: false,
            reason: "system-protection-unavailable",
          }),
      },
    });

    await submitDisable(CURRENT_PASSWORD, true);

    const alert = await findFailureAlert(
      "系统暂时无法保护数据密钥, 主密码保持开启. 请稍后重试.",
    );
    expect(alert.textContent).not.toContain(CURRENT_PASSWORD);
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it("意外失败时在顶部提示条显示统一的提示", async () => {
    await renderDisableDialog({
      masterPasswordBridgeOverrides: {
        disable: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });

    await submitDisable(CURRENT_PASSWORD, true);

    await findFailureAlert("操作失败, 主密码设置保持不变. 请稍后重试.");
  });

  it("桥抛出错误时也按意外失败提示, 对话框保持打开", async () => {
    const { onClose } = await renderDisableDialog({
      masterPasswordBridgeOverrides: {
        disable: () => Promise.reject(new Error("通道断开")),
      },
    });

    await submitDisable(CURRENT_PASSWORD, true);

    await findFailureAlert("操作失败, 主密码设置保持不变. 请稍后重试.");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("关闭主密码对话框: 执行中", () => {
  it("执行中显示等待说明, 提交按钮显示处理中并禁用, 按 Escape 不关闭", async () => {
    const pending = createDeferred<VaultOperationResult>();
    const { onClose, onSucceeded } = await renderDisableDialog({
      masterPasswordBridgeOverrides: { disable: () => pending.promise },
    });

    await submitDisable(CURRENT_PASSWORD, true);

    const submitting = await screen.findByRole("button", {
      name: "正在关闭...",
    });
    expect((submitting as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText("正在请系统保护数据密钥, 可能要等十几秒."),
    ).toBeDefined();
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ ok: true }));
    await waitFor(() => expect(onSucceeded).toHaveBeenCalledTimes(1));
  });
});

describe("关闭主密码对话框: 取消与英文界面", () => {
  it("点取消通知调用方关闭, 不调用桥", async () => {
    const { environment, onClose } = await renderDisableDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "取消" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(environment.masterPasswordBridge.disable).not.toHaveBeenCalled();
  });

  it("切到英文后标题, 风险提示与勾选都是英文", async () => {
    const { environment } = await renderDisableDialog();

    await act(() => environment.i18n.changeLanguage("en"));

    const dialog = within(
      await screen.findByRole("dialog", { name: "Turn off master password" }),
    );
    expect(dialog.getByText("Protection gets weaker")).toBeDefined();
    expect(
      dialog.getByText(
        "Anyone who can sign in to this Windows account can open the app directly. Your data files stay encrypted, but if the system key stops working (after reinstalling Windows or resetting the Windows password), only the recovery key can get your data back, so make sure it is stored safely.",
      ),
    ).toBeDefined();
    expect(dialog.getByLabelText("Current master password")).toBeDefined();
    expect(
      dialog.getByRole("checkbox", {
        name: "I understand the protection after turning it off",
      }),
    ).toBeDefined();
  });
});
