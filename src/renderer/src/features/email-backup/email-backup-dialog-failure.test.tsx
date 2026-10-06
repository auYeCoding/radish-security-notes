import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  emailBackupSucceeded,
  type EmailBackupFailureReason,
} from "@shared/email-backup/email-backup-result";

import {
  failingEmailBackupWith,
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  savedEmailBackupOverrides,
} from "@renderer/testing/fake-email-backup-bridge";
import {
  isButtonDisabled,
  openEmailBackupDialogWith,
} from "@renderer/testing/open-email-backup-dialog";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 渲染邮箱备份入口并点开对话框, 读到已保存的设置, 立即备份与发送测试邮件都以给定原因失败.
 * @param reason 失败原因.
 * @returns 打开之后兑现.
 */
async function openFailing(reason: EmailBackupFailureReason): Promise<void> {
  await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
    emailBackupBridgeOverrides: savedEmailBackupOverrides(undefined, {
      runBackup: failingEmailBackupWith(reason),
      sendTest: failingEmailBackupWith(reason),
    }),
  });
}

/**
 * 点一个按钮.
 * @param name 按钮的名称.
 * @returns 点击完成后兑现.
 */
async function click(name: string): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name }));
}

describe("邮箱备份对话框: 认证失败", () => {
  it("显示认证失败提示, 授权码框标红提示重填, 重填后提示消失并可保存", async () => {
    await openFailing("authentication-failed");

    await click("立即备份");

    expect(
      await screen.findByText(/认证失败: 邮箱地址或授权码不正确/),
    ).toBeDefined();
    expect(screen.getByText("认证没有通过, 请重新填写授权码.")).toBeDefined();
    expect(isButtonDisabled("保存设置")).toBe(true);

    await userEvent
      .setup()
      .type(screen.getByLabelText("授权码或应用专用密码"), "new-code-1234567");

    expect(screen.queryByText("认证没有通过, 请重新填写授权码.")).toBeNull();
    expect(screen.queryByText(/认证失败: 邮箱地址或授权码不正确/)).toBeNull();
    expect(isButtonDisabled("保存设置")).toBe(false);
  });
});

describe("邮箱备份对话框: 其它失败", () => {
  it.each([
    ["connection-failed", /无法连接邮箱服务器/],
    ["send-failed", /发送失败, 邮箱服务器没有接受邮件/],
    ["server-rejected-size", /邮箱服务器拒收: 邮件过大/],
    ["no-entries", /保险库里没有条目, 无需备份/],
  ] as const)("立即备份失败: %s", async (reason, message) => {
    await openFailing(reason);

    await click("立即备份");

    expect(await screen.findByText(message)).toBeDefined();
    expect(isButtonDisabled("立即备份")).toBe(false);
  });

  it("发送测试邮件失败时显示失败原因", async () => {
    await openFailing("connection-failed");

    await click("发送测试邮件");

    expect(await screen.findByText(/无法连接邮箱服务器/)).toBeDefined();
  });
});

describe("邮箱备份对话框: 发送测试邮件与上次结果", () => {
  it("测试邮件发出后提示, 不含任何条目数据", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      { emailBackupBridgeOverrides: savedEmailBackupOverrides() },
    );

    await click("发送测试邮件");

    expect(await screen.findByText("测试邮件已发出")).toBeDefined();
    expect(environment.emailBackupBridge.sendTest).toHaveBeenCalledTimes(1);
  });

  it("显示上次备份的结果: 时间, 失败与失败原因", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: savedEmailBackupOverrides(undefined, {
        getLastResult: vi.fn(() =>
          Promise.resolve(
            emailBackupSucceeded({
              completedAt: new Date(2026, 9, 5, 20, 30).getTime(),
              outcome: "failure" as const,
              reason: "connection-failed" as const,
              triggerKind: "scheduled" as const,
            }),
          ),
        ),
      }),
    });

    expect(screen.getByText(/失败: 无法连接邮箱服务器/)).toBeDefined();
    expect(screen.getByText(/\(定时\) 失败/)).toBeDefined();
    expect(FAKE_SAVED_EMAIL_BACKUP_VIEW.isSaved).toBe(true);
  });
});
