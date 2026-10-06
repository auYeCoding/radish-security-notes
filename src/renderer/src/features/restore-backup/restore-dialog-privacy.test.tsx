import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RestoreBridge } from "@shared/restore/restore-bridge";

import {
  needsPassphraseWith,
  readyRestoreWith,
} from "@renderer/testing/fake-restore-bridge";
import {
  chooseBackupFile,
  openRestoreDialogWith,
} from "@renderer/testing/open-restore-dialog";

import { RestoreTrigger } from "./restore-trigger";

/**
 * 测试里输入的备份口令.
 */
const PASSPHRASE = "very-secret-passphrase";

/**
 * 测试里输入的主密码.
 */
const MASTER_PASSWORD = "very-secret-master";

/**
 * 页面上所有输入框里现有的值.
 * @returns 输入框的值.
 */
function inputValues(): readonly string[] {
  return Array.from(document.querySelectorAll("input")).map(
    (input) => input.value,
  );
}

/**
 * 页面上所有文字拼成的文本.
 * @returns 页面文本.
 */
function pageText(): string {
  return document.body.textContent;
}

describe("恢复对话框: 备份口令不外露", () => {
  it("提交之后口令不再出现在页面上, 也不会出现在别的调用里", async () => {
    const environment = await openRestoreDialogWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: { chooseFile: needsPassphraseWith(2048) },
    });
    await chooseBackupFile();
    const user = userEvent.setup();

    const passphraseField = await screen.findByLabelText("备份口令");
    expect(passphraseField.getAttribute("type")).toBe("password");
    await user.type(passphraseField, PASSPHRASE);
    await user.click(screen.getByRole("button", { name: "解密并预览" }));
    await screen.findByText("确认恢复内容");
    expect(pageText()).not.toContain(PASSPHRASE);
    expect(inputValues()).not.toContain(PASSPHRASE);
    expect(environment.restoreBridge.submitPassphrase).toHaveBeenCalledWith(
      PASSPHRASE,
    );

    await user.click(screen.getByRole("button", { name: "开始恢复" }));
    await screen.findByText("恢复完成");
    expect(pageText()).not.toContain(PASSPHRASE);
    expect(inputValues()).toEqual([]);
    expect(
      JSON.stringify(vi.mocked(environment.restoreBridge.run).mock.calls),
    ).not.toContain(PASSPHRASE);
  });
});

describe("恢复对话框: 主密码不外露", () => {
  it("主密码提交之后不再出现在页面上, 只在恢复请求里出现一次", async () => {
    const environment = await openRestoreDialogWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: {
        chooseFile: readyRestoreWith({ requiresMasterPassword: true }),
      },
    });
    await chooseBackupFile();
    const user = userEvent.setup();

    const masterField = await screen.findByLabelText("主密码");
    expect(masterField.getAttribute("type")).toBe("password");
    await user.type(masterField, MASTER_PASSWORD);
    await user.click(screen.getByRole("button", { name: "开始恢复" }));
    await screen.findByText("恢复完成");

    expect(pageText()).not.toContain(MASTER_PASSWORD);
    expect(inputValues()).toEqual([]);
    const run = vi.mocked<RestoreBridge["run"]>(environment.restoreBridge.run);
    expect(run.mock.calls).toEqual([
      [{ acknowledgesReplace: false, masterPassword: MASTER_PASSWORD }],
    ]);
  });
});

describe("恢复对话框: 没有文件路径与残留输入", () => {
  it("选择文件时不传任何文件路径, 关闭对话框再打开后没有残留的输入", async () => {
    const environment = await openRestoreDialogWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: { chooseFile: needsPassphraseWith(2048) },
    });
    await chooseBackupFile();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("备份口令"), PASSPHRASE);
    expect(vi.mocked(environment.restoreBridge.chooseFile).mock.calls).toEqual([
      [],
    ]);

    await user.click(screen.getByRole("button", { name: "关闭" }));
    await user.click(screen.getByRole("button", { name: "从备份恢复" }));
    await chooseBackupFile();

    expect(await screen.findByLabelText("备份口令")).toHaveProperty(
      "value",
      "",
    );
    expect(pageText()).not.toContain(PASSPHRASE);
  });
});
