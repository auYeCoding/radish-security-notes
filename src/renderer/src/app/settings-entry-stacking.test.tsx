import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  isDialogMounted,
  openSettingsDialogWith,
} from "@renderer/testing/open-settings-dialog";

import { SettingsEntry } from "./settings-entry";

/**
 * 生成设置入口元素.
 * @returns 设置入口元素.
 */
function createEntry(): React.ReactElement {
  return <SettingsEntry />;
}

/**
 * 设置对话框里四行的按钮名称, 它们打开的对话框与按钮同名.
 */
const ROW_NAMES = ["导入数据", "导出数据", "邮箱备份", "从备份恢复"] as const;

/**
 * 打开设置对话框, 再点开指定行的原对话框.
 * @param rowName 行按钮的名称.
 * @returns 打开后的原对话框元素.
 */
async function openRowDialog(rowName: string): Promise<HTMLElement> {
  await openSettingsDialogWith(createEntry);
  await userEvent.setup().click(screen.getByRole("button", { name: rowName }));
  return screen.findByRole("dialog", { name: rowName });
}

/**
 * 等设置对话框重新成为最上层, 即不再被遮住.
 * @returns 设置对话框元素.
 */
async function findSettingsDialogOnTop(): Promise<HTMLElement> {
  return screen.findByRole("dialog", { name: "设置" });
}

describe("设置入口: Escape 一次只关最上层", () => {
  it.each(ROW_NAMES)(
    "在 %s 对话框里按 Escape 只关它, 设置对话框仍在",
    async (rowName) => {
      await openRowDialog(rowName);

      await userEvent.setup().keyboard("{Escape}");

      await findSettingsDialogOnTop();
      expect(screen.queryByRole("dialog", { name: rowName })).toBeNull();
      expect(isDialogMounted("设置")).toBe(true);
    },
  );

  it("原对话框关闭后再按一次 Escape 才关设置对话框", async () => {
    await openRowDialog("导入数据");
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    await findSettingsDialogOnTop();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("点原对话框的关闭按钮只关它, 设置对话框仍在", async () => {
    const dialog = await openRowDialog("导入数据");

    await userEvent
      .setup()
      .click(within(dialog).getByRole("button", { name: "关闭" }));

    await findSettingsDialogOnTop();
    expect(screen.queryByRole("dialog", { name: "导入数据" })).toBeNull();
  });
});

describe("设置入口: 关闭原对话框后的焦点", () => {
  it.each(ROW_NAMES)(
    "关闭 %s 对话框后焦点回到设置对话框里对应行的按钮",
    async (rowName) => {
      await openRowDialog(rowName);

      await userEvent.setup().keyboard("{Escape}");

      await findSettingsDialogOnTop();
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("button", { name: rowName }),
        ),
      );
    },
  );
});
