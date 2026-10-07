import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  isDialogMounted,
  openSettingsDialogWith,
} from "@renderer/testing/open-settings-dialog";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { SettingsEntry } from "./settings-entry";

/**
 * 生成设置入口元素.
 * @returns 设置入口元素.
 */
function createEntry(): React.ReactElement {
  return <SettingsEntry />;
}

/**
 * 设置对话框里每一行要打开的原对话框: 行按钮的名称, 对话框的名称与对话框独有的说明.
 */
const DATA_ROWS = [
  {
    row: "导入数据",
    dialog: "导入数据",
    description:
      "把其他密码管理器导出的文件导入到这里. 文件在本机读取和解析, 内容不会离开应用.",
  },
  {
    row: "导出数据",
    dialog: "导出数据",
    description:
      "把保险库里的条目导出成一个文件, 保存到你选定的位置. 文件在本机生成, 内容不会离开应用.",
  },
  {
    row: "邮箱备份",
    dialog: "邮箱备份",
    description:
      "把全部数据按本应用的完整格式作为附件发到你自己的邮箱. 备份在本机生成, 只会发往你填写的邮箱服务器.",
  },
  {
    row: "从备份恢复",
    dialog: "从备份恢复",
    description:
      "选择从邮箱下载的备份文件, 预览内容并确认后恢复. 文件在本机读取与解密, 内容不会离开应用.",
  },
] as const;

describe("设置入口: 打开与关闭", () => {
  it("初始只有设置按钮, 没有对话框", async () => {
    await renderInEntryEnvironment(createEntry);

    expect(screen.getByRole("button", { name: "设置" })).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("点设置按钮打开设置对话框, 数据分区有四个入口按钮", async () => {
    await openSettingsDialogWith(createEntry);

    const section = within(screen.getByRole("region", { name: "数据" }));
    DATA_ROWS.forEach((data) =>
      expect(section.getByRole("button", { name: data.row })).toBeDefined(),
    );
  });

  it("点关闭按钮关闭设置对话框, 焦点回到设置按钮", async () => {
    await openSettingsDialogWith(createEntry);

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "设置" }),
      ),
    );
  });

  it("按 Escape 关闭设置对话框", async () => {
    await openSettingsDialogWith(createEntry);

    await userEvent.setup().keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("设置入口: 四个入口各自打开原对话框", () => {
  it.each(DATA_ROWS)(
    "点 $row 打开 $dialog 对话框, 设置对话框仍在下层",
    async (data) => {
      await openSettingsDialogWith(createEntry);

      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: data.row }));

      const dialog = await screen.findByRole("dialog", { name: data.dialog });
      expect(within(dialog).getByText(data.description)).toBeDefined();
      expect(isDialogMounted("设置")).toBe(true);
    },
  );
});

describe("设置入口: 英文界面", () => {
  it("设置按钮, 对话框与四个入口都是英文", async () => {
    const environment = await openSettingsDialogWith(createEntry);

    await act(() => environment.i18n.changeLanguage("en"));

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    const section = within(
      within(dialog).getByRole("region", { name: "Data" }),
    );
    [
      "Import data",
      "Export data",
      "Email backup",
      "Restore from backup",
    ].forEach((name) =>
      expect(section.getByRole("button", { name })).toBeDefined(),
    );
  });
});
