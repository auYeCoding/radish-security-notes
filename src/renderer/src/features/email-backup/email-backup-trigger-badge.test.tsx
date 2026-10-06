import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";
import {
  emailBackupFailed,
  emailBackupSucceeded,
} from "@shared/email-backup/email-backup-result";

import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  savedEmailBackupOverrides,
} from "@renderer/testing/fake-email-backup-bridge";

import { EmailBackupTrigger } from "./email-backup-trigger";
import { AUTO_BACKUP_FAILURE_POLL_MILLISECONDS } from "./use-auto-backup-failure";

/**
 * 最近一次自动备份失败的状态.
 */
const FAILED_STATUS: AutoBackupStatus = {
  isEnabled: true,
  interval: "daily",
  phase: "backing-off",
  lastFailureReason: "connection-failed",
  lastFailureAt: new Date(2026, 9, 5, 21, 0).getTime(),
};

/**
 * 渲染侧栏入口, 假桥读取自动备份时依次返回给定的结果.
 * @param results 每次读取自动备份状态的结果, 用完后重复最后一个.
 * @returns 渲染完成后兑现.
 */
async function renderTrigger(
  results: readonly (AutoBackupStatus | undefined)[],
): Promise<void> {
  let index = 0;
  const environment = await createEntryTestEnvironment({
    emailBackupBridgeOverrides: savedEmailBackupOverrides(
      FAKE_SAVED_EMAIL_BACKUP_VIEW,
      {
        getAutoBackup: vi.fn(() => {
          const status = results[Math.min(index, results.length - 1)];
          index += 1;
          return Promise.resolve(
            status === undefined
              ? emailBackupFailed("vault-locked")
              : emailBackupSucceeded(status),
          );
        }),
      },
    ),
  });
  render(<EmailBackupTrigger />, { wrapper: environment.Providers });
}

describe("邮箱备份入口: 自动备份失败标记", () => {
  it("最近一次自动备份失败时按钮上有失败标记", async () => {
    await renderTrigger([FAILED_STATUS]);

    expect(await screen.findByText("自动备份失败")).toBeDefined();
  });

  it("没有失败时没有标记", async () => {
    await renderTrigger([{ ...FAILED_STATUS, lastFailureReason: undefined }]);
    await waitFor(() => expect(screen.getByRole("button")).toBeDefined());
    expect(screen.queryByText("自动备份失败")).toBeNull();
  });

  it("读取失败 (例如保险库未解锁) 时没有标记", async () => {
    await renderTrigger([undefined]);
    await waitFor(() => expect(screen.getByRole("button")).toBeDefined());
    expect(screen.queryByText("自动备份失败")).toBeNull();
  });
});

describe("邮箱备份入口: 标记的刷新", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("每分钟重新读取一次, 之后成功了标记消失", async () => {
    await renderTrigger([
      FAILED_STATUS,
      { ...FAILED_STATUS, lastFailureReason: undefined },
    ]);
    expect(await screen.findByText("自动备份失败")).toBeDefined();

    await vi.advanceTimersByTimeAsync(AUTO_BACKUP_FAILURE_POLL_MILLISECONDS);

    await waitFor(() => expect(screen.queryByText("自动备份失败")).toBeNull());
  });

  it("打开对话框时标记隐藏, 关闭后立即重新读取", async () => {
    await renderTrigger([FAILED_STATUS]);
    await screen.findByText("自动备份失败");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: /邮箱备份/ }));
    await screen.findByRole("dialog");
    expect(screen.queryByText("自动备份失败")).toBeNull();
    await user.keyboard("{Escape}");

    expect(await screen.findByText("自动备份失败")).toBeDefined();
  });
});
