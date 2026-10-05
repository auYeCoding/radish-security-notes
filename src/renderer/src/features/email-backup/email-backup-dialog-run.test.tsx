import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  emailBackupSucceeded,
  type EmailBackupResult,
  type EmailBackupRunOutcome,
} from "@shared/email-backup/email-backup-result";

import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  FAKE_EMAIL_BACKUP_SUMMARY,
  savedEmailBackupOverrides,
} from "@renderer/testing/fake-email-backup-bridge";
import {
  isButtonDisabled,
  openEmailBackupDialogWith,
} from "@renderer/testing/open-email-backup-dialog";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 立即备份发出的结果.
 */
const SENT: EmailBackupResult<EmailBackupRunOutcome> = emailBackupSucceeded({
  status: "sent",
  summary: FAKE_EMAIL_BACKUP_SUMMARY,
});

/**
 * 估计超出上限且可以去掉附件的结果: 约 6 MB, 上限 5 MB.
 * @param canDropAttachments 去掉附件后重发是否还有意义.
 * @returns 立即备份的结果.
 */
function tooLarge(
  canDropAttachments: boolean,
): EmailBackupResult<EmailBackupRunOutcome> {
  return emailBackupSucceeded({
    status: "too-large",
    estimatedSizeBytes: 6 * 1024 * 1024,
    limitBytes: 5 * 1024 * 1024,
    canDropAttachments,
  });
}

/**
 * 渲染邮箱备份入口并点开对话框, 读到已保存的设置.
 * @param runBackup 立即备份的间谍实现.
 * @returns 条目环境.
 */
function openSaved(
  runBackup: () => Promise<EmailBackupResult<EmailBackupRunOutcome>>,
): Promise<EntryTestEnvironment> {
  return openEmailBackupDialogWith(() => <EmailBackupTrigger />, {
    emailBackupBridgeOverrides: savedEmailBackupOverrides(undefined, {
      runBackup: vi.fn(runBackup),
    }),
  });
}

/**
 * 点 "立即备份".
 * @returns 点击完成后兑现.
 */
async function clickRun(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "立即备份" }));
}

describe("邮箱备份对话框: 立即备份成功", () => {
  it("显示结果摘要, 请求不带主密码, 备份后刷新上次结果", async () => {
    const environment = await openSaved(() => Promise.resolve(SENT));

    await clickRun();

    expect(await screen.findByText("备份已发出")).toBeDefined();
    expect(screen.getByText("备份的条目").nextSibling?.textContent).toBe("8");
    expect(screen.getByText("备份的附件").nextSibling?.textContent).toBe("3");
    expect(screen.getByText("备份大小").nextSibling?.textContent).toBe("5 MB");
    expect(screen.getByText("加密").nextSibling?.textContent).toBe("口令加密");
    expect(environment.emailBackupBridge.runBackup).toHaveBeenCalledWith({
      withoutAttachments: false,
    });
    await waitFor(() =>
      expect(environment.emailBackupBridge.getLastResult).toHaveBeenCalledTimes(
        2,
      ),
    );
  });
});

describe("邮箱备份对话框: 备份进行中", () => {
  it("显示阶段与进度, 全部按钮不可点, 不能直接关闭", async () => {
    const pending =
      Promise.withResolvers<EmailBackupResult<EmailBackupRunOutcome>>();
    const environment = await openEmailBackupDialogWith(
      () => <EmailBackupTrigger />,
      {
        emailBackupBridgeOverrides: savedEmailBackupOverrides(undefined, {
          runBackup: vi.fn(() => pending.promise),
          getProgress: vi.fn(() =>
            Promise.resolve({
              stage: "writing" as const,
              processed: 5,
              total: 10,
            }),
          ),
        }),
      },
    );

    await clickRun();

    expect(await screen.findByText("正在生成备份...")).toBeDefined();
    expect(screen.getByText("5 / 10")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "50",
    );
    expect(isButtonDisabled("立即备份")).toBe(true);
    expect(isButtonDisabled("保存设置")).toBe(true);
    expect(screen.queryByRole("button", { name: "关闭" })).toBeNull();
    expect(environment.emailBackupBridge.getProgress).toHaveBeenCalled();

    pending.resolve(SENT);
    expect(await screen.findByText("备份已发出")).toBeDefined();
  });
});

describe("邮箱备份对话框: 超出邮箱上限", () => {
  it("提示大小与上限, 选去掉附件后再发会带上去附件的标志重发", async () => {
    const runBackup = vi
      .fn<() => Promise<EmailBackupResult<EmailBackupRunOutcome>>>()
      .mockResolvedValueOnce(tooLarge(true))
      .mockResolvedValueOnce(SENT);
    const environment = await openSaved(runBackup);

    await clickRun();
    expect(
      await screen.findByText(/约 6 MB, 超过了你设置的单封上限 5 MB/),
    ).toBeDefined();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "去掉附件后再发" }));

    expect(await screen.findByText("备份已发出")).toBeDefined();
    expect(environment.emailBackupBridge.runBackup).toHaveBeenNthCalledWith(2, {
      withoutAttachments: true,
    });
  });

  it("选取消后提示消失, 不再发送", async () => {
    const environment = await openSaved(() => Promise.resolve(tooLarge(true)));

    await clickRun();
    await screen.findByText("备份超出邮箱上限, 没有发送");
    await userEvent.setup().click(screen.getByRole("button", { name: "取消" }));

    expect(screen.queryByText("备份超出邮箱上限, 没有发送")).toBeNull();
    expect(environment.emailBackupBridge.runBackup).toHaveBeenCalledTimes(1);
  });

  it("备份本来就不含附件时只提供取消并提示调高上限", async () => {
    await openSaved(() => Promise.resolve(tooLarge(false)));

    await clickRun();

    expect(
      await screen.findByText(/这份备份已不含附件, 仍超出上限/),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "去掉附件后再发" })).toBeNull();
    expect(screen.getByRole("button", { name: "取消" })).toBeDefined();
  });
});
