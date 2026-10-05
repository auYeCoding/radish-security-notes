import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { failingEmailBackupWith } from "@renderer/testing/fake-email-backup-bridge";
import {
  fillNewAccount,
  isButtonDisabled,
  openEmailBackupDialogWith,
} from "@renderer/testing/open-email-backup-dialog";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 渲染邮箱备份入口并点开对话框.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
function openEmailBackupDialog(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  return openEmailBackupDialogWith(() => <EmailBackupTrigger />, options);
}

/**
 * 点 "保存设置".
 * @returns 点击完成后兑现.
 */
async function clickSave(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "保存设置" }));
}

describe("邮箱备份对话框: 初始状态", () => {
  it("显示标题与说明, 默认选 QQ 邮箱, 三个操作按钮都不可点", async () => {
    await openEmailBackupDialog();
    expect(screen.getByRole("heading", { name: "邮箱备份" })).toBeDefined();
    expect(
      screen.getByRole("combobox", { name: "邮箱类型" }).textContent,
    ).toContain("QQ 邮箱");
    expect(isButtonDisabled("保存设置")).toBe(true);
    expect(isButtonDisabled("发送测试邮件")).toBe(true);
    expect(isButtonDisabled("立即备份")).toBe(true);
    expect(screen.getByText("还没有备份过.")).toBeDefined();
  });

  it("读取设置失败时显示失败提示, 没有表单", async () => {
    await renderInEntryEnvironment(() => <EmailBackupTrigger />, {
      emailBackupBridgeOverrides: {
        getSettings: failingEmailBackupWith("vault-locked"),
      },
    });
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "邮箱备份" }));
    expect(await screen.findByText(/无法读取邮箱备份设置/)).toBeDefined();
    expect(screen.queryByLabelText("邮箱地址")).toBeNull();
  });
});

describe("邮箱备份对话框: 保存设置", () => {
  it("填好必填项后可以保存, 保存请求带授权码与口令, 不带主密码", async () => {
    const environment = await openEmailBackupDialog();
    await fillNewAccount();
    expect(isButtonDisabled("保存设置")).toBe(false);

    await clickSave();

    expect(await screen.findByText("设置已保存.")).toBeDefined();
    const request = vi.mocked(environment.emailBackupBridge.saveSettings).mock
      .calls[0]?.[0];
    expect(request).toMatchObject({
      provider: "qq",
      senderAddress: "alice@qq.com",
      authorizationCode: "abcdefghijklmnop",
      passphrase: "a long enough passphrase",
      isEncrypted: true,
    });
    expect(request).not.toHaveProperty("masterPassword");
  });

  it("保存后授权码框清空, 说明里写明已保存, 测试与备份按钮可点", async () => {
    await openEmailBackupDialog();
    await fillNewAccount();
    await clickSave();
    await screen.findByText("设置已保存.");

    expect(
      (screen.getByLabelText("授权码或应用专用密码") as HTMLInputElement).value,
    ).toBe("");
    expect(screen.getByText(/已保存授权码, 留空则保持不变/)).toBeDefined();
    expect(isButtonDisabled("发送测试邮件")).toBe(false);
    expect(isButtonDisabled("立即备份")).toBe(false);
  });
});
