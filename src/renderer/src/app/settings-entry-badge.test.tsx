import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";

import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  autoBackupStatusOverrides,
  FAILED_AUTO_BACKUP_STATUS,
} from "@renderer/testing/fake-auto-backup-status";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { SettingsEntry } from "./settings-entry";

/**
 * 自动备份失败标记的文字.
 */
const FAILURE_BADGE_TEXT = "自动备份失败";

/**
 * 最近一次自动备份没有失败的状态.
 */
const HEALTHY_STATUS: AutoBackupStatus = {
  isEnabled: true,
  interval: "daily",
  phase: "scheduled",
};

/**
 * 渲染设置入口, 假桥读取自动备份状态时依次返回给定的结果.
 * @param results 每次读取自动备份状态的结果, 用完后重复最后一个.
 * @returns 条目环境.
 */
async function renderEntry(
  results: readonly (AutoBackupStatus | undefined)[],
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(
    () => <SettingsEntry />,
    { emailBackupBridgeOverrides: autoBackupStatusOverrides(results) },
  );
  return environment;
}

/**
 * 等假桥至少读取过一次自动备份状态, 并让读取结果落到界面上.
 * @param environment 条目环境.
 * @returns 读取完成后兑现.
 */
async function waitForStatusRead(
  environment: EntryTestEnvironment,
): Promise<void> {
  await waitFor(() =>
    expect(environment.emailBackupBridge.getAutoBackup).toHaveBeenCalled(),
  );
  await act(() => Promise.resolve());
}

/**
 * 点设置按钮, 等设置对话框出现.
 * @returns 打开完成后兑现.
 */
async function openSettings(): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name: /设置/ }));
  await screen.findByRole("dialog", { name: "设置" });
}

describe("设置入口: 设置按钮上的失败标记", () => {
  it("最近一次自动备份失败时设置按钮上有失败标记", async () => {
    await renderEntry([FAILED_AUTO_BACKUP_STATUS]);

    const button = screen.getByRole("button", { name: /设置/ });
    expect(await within(button).findByText(FAILURE_BADGE_TEXT)).toBeDefined();
  });

  it("没有失败时设置按钮上没有标记", async () => {
    const environment = await renderEntry([HEALTHY_STATUS]);

    await waitForStatusRead(environment);

    expect(screen.queryByText(FAILURE_BADGE_TEXT)).toBeNull();
  });

  it("读取失败 (例如保险库未解锁) 时没有标记", async () => {
    const environment = await renderEntry([undefined]);

    await waitForStatusRead(environment);

    expect(screen.queryByText(FAILURE_BADGE_TEXT)).toBeNull();
  });

  it("界面切到英文后标记是英文", async () => {
    const environment = await renderEntry([FAILED_AUTO_BACKUP_STATUS]);
    await screen.findByText(FAILURE_BADGE_TEXT);

    await act(() => environment.i18n.changeLanguage("en"));

    expect(await screen.findByText("Auto backup failed")).toBeDefined();
  });
});

describe("设置入口: 设置对话框里邮箱备份行上的失败标记", () => {
  it("失败时标记只出现在邮箱备份行上, 设置按钮上的标记隐藏", async () => {
    await renderEntry([FAILED_AUTO_BACKUP_STATUS]);
    await screen.findByText(FAILURE_BADGE_TEXT);

    await openSettings();

    const emailBackupRow = screen.getByRole("button", { name: /邮箱备份/ });
    expect(await within(emailBackupRow).findByText(FAILURE_BADGE_TEXT)).toBe(
      screen.getByText(FAILURE_BADGE_TEXT),
    );
    expect(screen.getAllByText(FAILURE_BADGE_TEXT)).toHaveLength(1);
  });

  it("没有失败时设置按钮与邮箱备份行都没有标记", async () => {
    const environment = await renderEntry([HEALTHY_STATUS]);

    await openSettings();
    await waitForStatusRead(environment);

    expect(screen.queryByText(FAILURE_BADGE_TEXT)).toBeNull();
  });
});

describe("设置入口: 失败标记的隐藏与刷新", () => {
  it("打开邮箱备份对话框后行上的标记隐藏, 关闭后立即重新读取", async () => {
    await renderEntry([FAILED_AUTO_BACKUP_STATUS]);
    await openSettings();
    const user = userEvent.setup();
    await screen.findByText(FAILURE_BADGE_TEXT);

    await user.click(screen.getByRole("button", { name: /邮箱备份/ }));
    await screen.findByRole("dialog", { name: "邮箱备份" });
    expect(screen.queryByText(FAILURE_BADGE_TEXT)).toBeNull();
    await user.keyboard("{Escape}");

    await screen.findByRole("dialog", { name: "设置" });
    expect(await screen.findByText(FAILURE_BADGE_TEXT)).toBeDefined();
  });

  it("关闭设置对话框后设置按钮上的标记立即回来", async () => {
    await renderEntry([FAILED_AUTO_BACKUP_STATUS]);
    await openSettings();

    await userEvent.setup().keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const button = screen.getByRole("button", { name: /设置/ });
    expect(await within(button).findByText(FAILURE_BADGE_TEXT)).toBeDefined();
  });
});
