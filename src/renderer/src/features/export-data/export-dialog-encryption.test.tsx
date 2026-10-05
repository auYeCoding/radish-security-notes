import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { openExportDialogWith } from "@renderer/testing/open-export-dialog";

import { ExportTrigger } from "./export-trigger";

/**
 * 渲染导出入口并点开对话框.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
function openExportDialog(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  return openExportDialogWith(() => <ExportTrigger />, options);
}

/**
 * 勾选 "用口令加密导出文件".
 * @returns 勾选完成后兑现.
 */
async function enableEncryption(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("checkbox", { name: "用口令加密导出文件" }));
}

/**
 * 第一步的 "下一步" 按钮是否不可点.
 * @returns 不可点时为 true.
 */
function isNextDisabled(): boolean {
  return screen
    .getByRole("button", { name: "下一步" })
    .hasAttribute("disabled");
}

describe("导出对话框: 口令加密", () => {
  it("默认不加密, 不显示口令输入框, 勾选后出现口令与确认口令", async () => {
    await openExportDialog();
    expect(screen.queryByLabelText("加密口令")).toBeNull();
    expect(isNextDisabled()).toBe(false);

    await enableEncryption();

    expect(screen.getByLabelText("加密口令")).toBeDefined();
    expect(screen.getByLabelText("确认口令")).toBeDefined();
    expect(screen.getByText(/忘记口令后文件无法找回/)).toBeDefined();
    expect(isNextDisabled()).toBe(true);
  });

  it("口令太短时提示最短长度, 不能进入下一步", async () => {
    await openExportDialog();
    await enableEncryption();

    await userEvent.setup().type(screen.getByLabelText("加密口令"), "short");

    expect(screen.getByText("口令至少需要 12 个字符.")).toBeDefined();
    expect(isNextDisabled()).toBe(true);
  });

  it("两次输入不一致时提示, 一致后可以进入下一步", async () => {
    await openExportDialog();
    await enableEncryption();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("加密口令"), "a-long-passphrase");

    await user.type(screen.getByLabelText("确认口令"), "a-long-passphras");
    expect(screen.getByText("两次输入的口令不一致.")).toBeDefined();
    expect(isNextDisabled()).toBe(true);

    await user.type(screen.getByLabelText("确认口令"), "e");
    expect(screen.queryByText("两次输入的口令不一致.")).toBeNull();
    expect(isNextDisabled()).toBe(false);
  });
});

describe("导出对话框: 加密后的确认步骤", () => {
  it("加密时只提示忘记口令无法找回, 不要求确认明文风险, 口令不进摘要", async () => {
    await openExportDialog();
    await enableEncryption();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("加密口令"), "a-long-passphrase");
    await user.type(screen.getByLabelText("确认口令"), "a-long-passphrase");

    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByText("忘记口令无法找回")).toBeDefined();
    expect(screen.getByText("口令加密")).toBeDefined();
    expect(screen.queryByText("导出文件是明文")).toBeNull();
    expect(screen.queryByText(/a-long-passphrase/)).toBeNull();
  });
});
