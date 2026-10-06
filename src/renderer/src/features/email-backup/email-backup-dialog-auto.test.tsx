import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_AUTO_BACKUP_STATUS,
  type AutoBackupStatus,
} from "@shared/email-backup/auto-backup-status";
import {
  emailBackupFailed,
  emailBackupSucceeded,
} from "@shared/email-backup/email-backup-result";

import {
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  savedEmailBackupOverrides,
} from "@renderer/testing/fake-email-backup-bridge";
import { openEmailBackupDialogWith } from "@renderer/testing/open-email-backup-dialog";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 自动备份已开启, 每天一次, 下次计划时间在 2026-10-06 08:00 的状态.
 */
const ENABLED_STATUS: AutoBackupStatus = {
  isEnabled: true,
  interval: "daily",
  phase: "scheduled",
  nextRunAt: new Date(2026, 9, 6, 8, 0).getTime(),
};

/**
 * 设了主密码的已保存设置.
 */
const PROTECTED_VIEW = {
  ...FAKE_SAVED_EMAIL_BACKUP_VIEW,
  requiresMasterPassword: true,
};

/**
 * 取自动备份开关.
 * @returns 开关元素.
 */
function autoSwitch(): HTMLElement {
  return screen.getByRole("switch", { name: "开启自动备份" });
}

/**
 * 生成让假桥读到指定自动备份状态的覆盖项.
 * @param status 读取自动备份时返回的状态.
 * @param view 读取设置时返回的视图.
 * @returns 假桥覆盖项.
 */
function withAutoStatus(
  status: AutoBackupStatus,
  view = FAKE_SAVED_EMAIL_BACKUP_VIEW,
): ReturnType<typeof savedEmailBackupOverrides> {
  return savedEmailBackupOverrides(view, {
    getAutoBackup: vi.fn(() => Promise.resolve(emailBackupSucceeded(status))),
  });
}

describe("邮箱备份对话框: 自动备份开关", () => {
  it("默认关闭, 打开时保存默认间隔, 保存后开关是开的并说明下一次检查才发", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      { emailBackupBridgeOverrides: savedEmailBackupOverrides() },
    );
    expect(screen.getByRole("heading", { name: "自动备份" })).toBeDefined();
    expect(autoSwitch().getAttribute("aria-checked")).toBe("false");

    await userEvent.setup().click(autoSwitch());

    await waitFor(() =>
      expect(autoSwitch().getAttribute("aria-checked")).toBe("true"),
    );
    expect(environment.emailBackupBridge.saveAutoBackup).toHaveBeenCalledWith({
      isEnabled: true,
      interval: "daily",
    });
    expect(
      screen.getByText("已到备份时间, 将在下一次检查时发送."),
    ).toBeDefined();
  });

  it("开着时点开关保存为关闭", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      { emailBackupBridgeOverrides: withAutoStatus(ENABLED_STATUS) },
    );

    await userEvent.setup().click(autoSwitch());

    await waitFor(() =>
      expect(autoSwitch().getAttribute("aria-checked")).toBe("false"),
    );
    expect(environment.emailBackupBridge.saveAutoBackup).toHaveBeenCalledWith({
      isEnabled: false,
      interval: "daily",
    });
  });
});

describe("邮箱备份对话框: 自动备份不能开启", () => {
  it("邮箱设置不全时开关不可点, 写明原因", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: withAutoStatus({
        ...DEFAULT_AUTO_BACKUP_STATUS,
        blocker: "not-configured",
      }),
    });

    expect(autoSwitch().getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByText(
        "现在还不能开启自动备份: 还没有保存邮箱设置, 请先保存设置.",
      ),
    ).toBeDefined();
  });

  it("有未保存的修改时开关不可点", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: savedEmailBackupOverrides(),
    });

    await userEvent
      .setup()
      .type(screen.getByLabelText("收件邮箱"), "b@example.com");

    expect(autoSwitch().getAttribute("aria-disabled")).toBe("true");
  });
});

describe("邮箱备份对话框: 自动备份与主密码", () => {
  it("设了主密码时填写前开关不可点并提示, 填写后保存请求带上主密码", async () => {
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      {
        emailBackupBridgeOverrides: withAutoStatus(
          DEFAULT_AUTO_BACKUP_STATUS,
          PROTECTED_VIEW,
        ),
      },
    );
    expect(autoSwitch().getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByText("开启自动备份或更改间隔前, 请先在下方输入主密码."),
    ).toBeDefined();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("主密码"), "my-master");
    await user.click(autoSwitch());

    await waitFor(() =>
      expect(environment.emailBackupBridge.saveAutoBackup).toHaveBeenCalledWith(
        {
          isEnabled: true,
          interval: "daily",
          masterPassword: "my-master",
        },
      ),
    );
  });

  it("主密码不对时提示并清空主密码, 开关保持原状", async () => {
    await openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: savedEmailBackupOverrides(PROTECTED_VIEW, {
        saveAutoBackup: vi.fn(() =>
          Promise.resolve(emailBackupFailed("wrong-master-password")),
        ),
      }),
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("主密码"), "wrong");

    await user.click(autoSwitch());

    expect(
      (await screen.findAllByText("主密码不正确, 请重新输入.")).length,
    ).toBeGreaterThan(0);
    expect(autoSwitch().getAttribute("aria-checked")).toBe("false");
    expect((screen.getByLabelText("主密码") as HTMLInputElement).value).toBe(
      "",
    );
  });
});
