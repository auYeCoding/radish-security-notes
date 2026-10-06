import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  FAKE_FILLED_RESTORE_VAULT,
  failingRestoreWith,
  readyRestoreWith,
} from "@renderer/testing/fake-restore-bridge";
import type { EntryTestEnvironmentOptions } from "@renderer/testing/entry-test-environment";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { RestoreTrigger } from "./restore-trigger";

/**
 * 渲染恢复入口, 把界面切到英文, 点开对话框并点 "选择备份文件".
 * @param options 条目环境的选项.
 * @returns 点击完成后兑现.
 */
async function chooseFileInEnglish(
  options: EntryTestEnvironmentOptions = {},
): Promise<void> {
  const { environment } = await renderInEntryEnvironment(
    () => <RestoreTrigger />,
    options,
  );
  await act(() => environment.i18n.changeLanguage("en"));
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Restore from backup" }));
  await user.click(
    await screen.findByRole("button", { name: "Choose a backup file..." }),
  );
}

describe("恢复对话框: 英文界面", () => {
  it("选择文件, 预览与按钮都是英文", async () => {
    await chooseFileInEnglish();

    expect(await screen.findByText("Confirm what to restore")).toBeDefined();
    expect(screen.getByText("Backup made on")).toBeDefined();
    expect(
      screen.getByText(
        "The vault is empty now, so the backup is written exactly as it is.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Start restore" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Choose another file" }),
    ).toBeDefined();
  });

  it("保险库里已有内容时确认按钮是 Clear and restore", async () => {
    await chooseFileInEnglish({
      restoreBridgeOverrides: {
        chooseFile: readyRestoreWith({ vault: FAKE_FILLED_RESTORE_VAULT }),
      },
    });

    expect(await screen.findByText("The vault will be cleared")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Clear and restore" }),
    ).toBeDefined();
  });
});

describe("恢复对话框: 英文界面的失败提示", () => {
  it("失败提示写出第一个问题的英文说明", async () => {
    await chooseFileInEnglish({
      restoreBridgeOverrides: {
        chooseFile: failingRestoreWith("invalid-content", {
          section: "entries",
          code: "duplicate-id",
          position: 3,
        }),
      },
    });

    expect(
      await screen.findByText(
        "The backup content is not valid and was rejected as a whole. Nothing was changed. First problem: entries, item 3, duplicate id.",
      ),
    ).toBeDefined();
  });
});
