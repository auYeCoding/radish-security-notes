import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  emailBackupFailed,
  emailBackupSucceeded,
} from "@shared/email-backup/email-backup-result";

import {
  FAKE_EMAIL_BACKUP_SUMMARY,
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  savedEmailBackupOverrides,
} from "@renderer/testing/fake-email-backup-bridge";
import {
  isButtonDisabled,
  openEmailBackupDialogWith,
} from "@renderer/testing/open-email-backup-dialog";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 设了主密码的已保存设置.
 */
const PROTECTED_VIEW = {
  ...FAKE_SAVED_EMAIL_BACKUP_VIEW,
  requiresMasterPassword: true,
};

describe("邮箱备份对话框: 重输主密码", () => {
  it("没设主密码时不显示主密码字段", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: savedEmailBackupOverrides(),
    });
    expect(screen.queryByLabelText("主密码")).toBeNull();
    expect(isButtonDisabled("立即备份")).toBe(false);
  });

  it("设了主密码时显示字段, 填写前立即备份不可点, 请求带上主密码", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      {
        emailBackupBridgeOverrides: savedEmailBackupOverrides(PROTECTED_VIEW),
      },
    );
    expect(isButtonDisabled("立即备份")).toBe(true);

    await userEvent.setup().type(screen.getByLabelText("主密码"), "my-master");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "立即备份" }));

    expect(await screen.findByText("备份已发出")).toBeDefined();
    expect(environment.emailBackupBridge.runBackup).toHaveBeenCalledWith({
      withoutAttachments: false,
      masterPassword: "my-master",
    });
  });
});

describe("邮箱备份对话框: 主密码不对", () => {
  it("提示主密码不正确并清空主密码字段", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: savedEmailBackupOverrides(PROTECTED_VIEW, {
        runBackup: vi.fn(() =>
          Promise.resolve(emailBackupFailed("wrong-master-password")),
        ),
      }),
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("主密码"), "wrong");

    await user.click(screen.getByRole("button", { name: "立即备份" }));

    expect(
      (await screen.findAllByText("主密码不正确, 请重新输入.")).length,
    ).toBeGreaterThan(0);
    expect((screen.getByLabelText("主密码") as HTMLInputElement).value).toBe(
      "",
    );
    expect(isButtonDisabled("立即备份")).toBe(true);
  });

  it("保存设置同样带上主密码, 保存成功后主密码保留供备份使用", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      {
        emailBackupBridgeOverrides: savedEmailBackupOverrides(PROTECTED_VIEW, {
          saveSettings: vi.fn(() =>
            Promise.resolve(emailBackupSucceeded(PROTECTED_VIEW)),
          ),
          runBackup: vi.fn(() =>
            Promise.resolve(
              emailBackupSucceeded({
                status: "sent" as const,
                summary: FAKE_EMAIL_BACKUP_SUMMARY,
              }),
            ),
          ),
        }),
      },
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("收件邮箱"), "b@example.com");
    await user.type(screen.getByLabelText("主密码"), "my-master");

    await user.click(screen.getByRole("button", { name: "保存设置" }));
    await screen.findByText("设置已保存.");

    expect(environment.emailBackupBridge.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ masterPassword: "my-master" }),
    );
    expect(isButtonDisabled("立即备份")).toBe(false);
  });
});
