import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RestoreBridge } from "@shared/restore/restore-bridge";
import {
  restoreFailed,
  restoreSucceeded,
} from "@shared/restore/restore-result";

import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  FAKE_RESTORE_PREVIEW,
  needsPassphraseWith,
} from "@renderer/testing/fake-restore-bridge";
import { isButtonDisabled } from "@renderer/testing/open-email-backup-dialog";
import {
  chooseBackupFile,
  openRestoreDialogWith,
} from "@renderer/testing/open-restore-dialog";

import { RestoreTrigger } from "./restore-trigger";

/**
 * 加密备份解开后给出的预览.
 */
const ENCRYPTED_PREVIEW = { ...FAKE_RESTORE_PREVIEW, isEncrypted: true };

/**
 * 渲染恢复入口, 选择一个口令加密的备份文件, 等输入口令的步骤出现.
 * @param overrides 覆盖假恢复桥上的方法.
 * @returns 条目环境.
 */
async function openPassphraseStep(
  overrides: Partial<RestoreBridge> = {},
): Promise<EntryTestEnvironment> {
  const environment = await openRestoreDialogWith(() => <RestoreTrigger />, {
    restoreBridgeOverrides: {
      chooseFile: needsPassphraseWith(2048),
      ...overrides,
    },
  });
  await chooseBackupFile();
  await screen.findByText("输入备份口令");
  return environment;
}

describe("恢复对话框: 输入口令", () => {
  it("加密备份先要求口令并说明文件大小, 口令为空时不能提交", async () => {
    await openPassphraseStep();

    expect(
      screen.getByText(
        "这个备份文件用口令加密 (约 2 KB), 请输入创建备份时设置的口令.",
      ),
    ).toBeDefined();
    expect(isButtonDisabled("解密并预览")).toBe(true);

    await userEvent.setup().type(screen.getByLabelText("备份口令"), "a");
    expect(isButtonDisabled("解密并预览")).toBe(false);
  });

  it("提交口令后进入预览, 预览里写口令加密", async () => {
    const submitPassphrase = vi.fn<RestoreBridge["submitPassphrase"]>(() =>
      Promise.resolve(
        restoreSucceeded({
          status: "ready" as const,
          preview: ENCRYPTED_PREVIEW,
        }),
      ),
    );
    await openPassphraseStep({ submitPassphrase });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("备份口令"), "right-passphrase");
    await user.click(screen.getByRole("button", { name: "解密并预览" }));

    expect(await screen.findByText("确认恢复内容")).toBeDefined();
    expect(submitPassphrase).toHaveBeenCalledWith("right-passphrase");
    expect(screen.getByText("口令加密")).toBeDefined();
  });

  it("在输入框里按回车也能提交", async () => {
    const environment = await openPassphraseStep();

    await userEvent
      .setup()
      .type(screen.getByLabelText("备份口令"), "right-passphrase{Enter}");

    expect(await screen.findByText("确认恢复内容")).toBeDefined();
    expect(environment.restoreBridge.submitPassphrase).toHaveBeenCalledTimes(1);
  });
});

describe("恢复对话框: 口令不对", () => {
  it("在输入框下提示并清空口令, 可以重试直到成功", async () => {
    const submitPassphrase = vi
      .fn<RestoreBridge["submitPassphrase"]>()
      .mockResolvedValueOnce(restoreFailed("wrong-passphrase"))
      .mockResolvedValueOnce(restoreFailed("wrong-passphrase"))
      .mockResolvedValueOnce(
        restoreSucceeded({
          status: "ready" as const,
          preview: ENCRYPTED_PREVIEW,
        }),
      );
    const environment = await openPassphraseStep({ submitPassphrase });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("备份口令"), "first-guess");
    await user.click(screen.getByRole("button", { name: "解密并预览" }));
    expect(await screen.findByText("口令不对, 请重新输入.")).toBeDefined();
    expect(screen.getByLabelText("备份口令")).toHaveProperty("value", "");
    expect(isButtonDisabled("解密并预览")).toBe(true);

    await user.type(screen.getByLabelText("备份口令"), "second-guess");
    expect(screen.queryByText("口令不对, 请重新输入.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "解密并预览" }));
    expect(await screen.findByText("口令不对, 请重新输入.")).toBeDefined();

    await user.type(screen.getByLabelText("备份口令"), "right-passphrase");
    await user.click(screen.getByRole("button", { name: "解密并预览" }));

    expect(await screen.findByText("确认恢复内容")).toBeDefined();
    expect(submitPassphrase.mock.calls).toEqual([
      ["first-guess"],
      ["second-guess"],
      ["right-passphrase"],
    ]);
    expect(environment.restoreBridge.chooseFile).toHaveBeenCalledTimes(1);
  });

  it("点重新选择回到选择文件, 并让主进程放弃所选文件", async () => {
    const environment = await openPassphraseStep();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "重新选择" }));

    expect(
      await screen.findByRole("button", { name: "选择备份文件..." }),
    ).toBeDefined();
    expect(environment.restoreBridge.cancel).toHaveBeenCalledTimes(1);
  });
});
