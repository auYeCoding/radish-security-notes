import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  savedEmailBackupOverrides,
} from "@renderer/testing/fake-email-backup-bridge";
import {
  fillNewAccount,
  isButtonDisabled,
  openEmailBackupDialogWith,
} from "@renderer/testing/open-email-backup-dialog";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 渲染邮箱备份入口并点开对话框, 读到已保存的设置.
 * @param isEncrypted 已保存的设置是否口令加密.
 * @returns 打开之后兑现.
 */
async function openSavedDialog(isEncrypted: boolean): Promise<void> {
  await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
    emailBackupBridgeOverrides: savedEmailBackupOverrides({
      ...FAKE_SAVED_EMAIL_BACKUP_VIEW,
      isEncrypted,
      hasPassphrase: isEncrypted,
      hasAcknowledgedPlaintextRisk: !isEncrypted,
    }),
  });
}

describe("邮箱备份对话框: 口令加密", () => {
  it("默认加密并显示口令与确认口令, 口令太短时提示最短长度", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />);
    expect(screen.getByLabelText("备份口令")).toBeDefined();
    expect(screen.getByText(/忘记口令后备份无法找回/)).toBeDefined();

    await userEvent.setup().type(screen.getByLabelText("备份口令"), "short");

    expect(screen.getByText("口令至少需要 12 个字符.")).toBeDefined();
  });

  it("两次输入不一致时提示, 保存按钮不可点, 一致后可以保存", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />);
    await fillNewAccount();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("确认口令"), "x");
    expect(screen.getByText("两次输入的口令不一致.")).toBeDefined();
    expect(isButtonDisabled("保存设置")).toBe(true);

    await user.type(screen.getByLabelText("确认口令"), "{Backspace}");
    expect(screen.queryByText("两次输入的口令不一致.")).toBeNull();
    expect(isButtonDisabled("保存设置")).toBe(false);
  });

  it("已保存过口令时说明里写明已保存, 两个口令框留空即可保存其它修改", async () => {
    await openSavedDialog(true);
    expect(screen.getByText(/已保存备份口令, 留空则保持不变/)).toBeDefined();
    expect(isButtonDisabled("保存设置")).toBe(true);

    await userEvent
      .setup()
      .type(screen.getByLabelText("收件邮箱"), "b@example.com");

    expect(isButtonDisabled("保存设置")).toBe(false);
  });
});

describe("邮箱备份对话框: 明文风险确认", () => {
  it("取消加密后显示风险提示与必须勾选的确认, 不勾选不能保存", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />);
    await fillNewAccount();
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: "用口令加密备份" }));

    expect(screen.getByText("备份将以明文发送")).toBeDefined();
    expect(screen.getByText(/邮箱账号被盗即全部凭据泄露\. 建议/)).toBeDefined();
    expect(screen.queryByLabelText("备份口令")).toBeNull();
    expect(isButtonDisabled("保存设置")).toBe(true);

    await user.click(
      screen.getByRole("checkbox", {
        name: "我了解邮箱账号被盗即全部凭据泄露",
      }),
    );

    expect(isButtonDisabled("保存设置")).toBe(false);
  });

  it("已保存的明文设置默认显示风险提示且确认已勾选", async () => {
    await openSavedDialog(false);
    expect(screen.getByText("备份将以明文发送")).toBeDefined();
    expect(
      screen
        .getByRole("checkbox", { name: "我了解邮箱账号被盗即全部凭据泄露" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});
