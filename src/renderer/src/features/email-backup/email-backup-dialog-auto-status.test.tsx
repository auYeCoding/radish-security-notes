import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";
import { emailBackupSucceeded } from "@shared/email-backup/email-backup-result";

import {
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  savedEmailBackupOverrides,
} from "@renderer/testing/fake-email-backup-bridge";
import { openEmailBackupDialogWith } from "@renderer/testing/open-email-backup-dialog";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 自动备份已开启, 每天一次, 下次计划时间在 2026-10-06 08:00 的状态.
 */
const SCHEDULED_STATUS: AutoBackupStatus = {
  isEnabled: true,
  interval: "daily",
  phase: "scheduled",
  nextRunAt: new Date(2026, 9, 6, 8, 0).getTime(),
};

/**
 * 最近一次自动备份失败的时刻: 2026-10-05 21:00.
 */
const FAILED_AT = new Date(2026, 9, 5, 21, 0).getTime();

/**
 * 生成让假桥读到指定自动备份状态的覆盖项.
 * @param status 读取自动备份时返回的状态.
 * @returns 假桥覆盖项.
 */
function withAutoStatus(
  status: AutoBackupStatus,
): ReturnType<typeof savedEmailBackupOverrides> {
  return savedEmailBackupOverrides(FAKE_SAVED_EMAIL_BACKUP_VIEW, {
    getAutoBackup: vi.fn(() => Promise.resolve(emailBackupSucceeded(status))),
  });
}

describe("邮箱备份对话框: 自动备份的状态说明", () => {
  it("已开启时写出下次计划时间", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: withAutoStatus(SCHEDULED_STATUS),
    });

    expect(screen.getByText(/下次计划备份: .*2026.*/)).toBeDefined();
  });

  it("失败后等待重试与本间隔不再尝试都有说明", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: withAutoStatus({
        ...SCHEDULED_STATUS,
        phase: "backing-off",
        lastFailureReason: "connection-failed",
        lastFailureAt: FAILED_AT,
      }),
    });

    expect(screen.getByText(/上次自动备份失败, .* 之后重试\./)).toBeDefined();
    expect(
      screen.getByText(/最近一次自动备份失败 \(.*\): 无法连接邮箱服务器/),
    ).toBeDefined();
  });
});

describe("邮箱备份对话框: 自动备份暂停与超限", () => {
  it("认证失败暂停时提示授权码可能失效, 要求重新保存", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: withAutoStatus({
        isEnabled: true,
        interval: "daily",
        phase: "paused",
        lastFailureReason: "authentication-failed",
        lastFailureAt: FAILED_AT,
      }),
    });

    expect(
      screen.getByText(/自动备份已暂停: 授权码可能失效, 请重新保存授权码/),
    ).toBeDefined();
    expect(
      screen.getByText(/最近一次自动备份失败 \(.*\): 认证失败/),
    ).toBeDefined();
  });

  it("超限时说明自动备份不会去掉附件, 提示手动处理", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: withAutoStatus({
        ...SCHEDULED_STATUS,
        phase: "exhausted",
        lastFailureReason: "too-large",
        lastFailureAt: FAILED_AT,
      }),
    });

    expect(screen.getByText(/自动备份不会擅自去掉附件/)).toBeDefined();
    expect(screen.getByText(/本间隔内连续失败, 不再尝试/)).toBeDefined();
  });
});

describe("邮箱备份对话框: 自动备份的间隔与刷新", () => {
  it("开着时换间隔保存新间隔, 开关保持打开", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      { emailBackupBridgeOverrides: withAutoStatus(SCHEDULED_STATUS) },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "备份间隔" }));
    await user.click(await screen.findByRole("option", { name: "每周" }));

    await waitFor(() =>
      expect(environment.emailBackupBridge.saveAutoBackup).toHaveBeenCalledWith(
        { isEnabled: true, interval: "weekly" },
      ),
    );
    expect(
      screen
        .getByRole("switch", { name: "开启自动备份" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("保存邮箱设置后重新读取自动备份状态", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      { emailBackupBridgeOverrides: savedEmailBackupOverrides() },
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("收件邮箱"), "b@example.com");
    vi.mocked(environment.emailBackupBridge.getAutoBackup).mockClear();

    await user.click(screen.getByRole("button", { name: "保存设置" }));
    await screen.findByText("设置已保存.");

    expect(environment.emailBackupBridge.getAutoBackup).toHaveBeenCalledTimes(
      1,
    );
  });
});
