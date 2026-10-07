import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@renderer/components/ui/button";
import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { SettingsDialog } from "./settings-dialog";

/**
 * 四行右侧的操作按钮, 名称各不相同, 方便按位置核对.
 */
const TEST_ENTRIES = {
  importAction: <Button>导入操作</Button>,
  exportAction: <Button>导出操作</Button>,
  emailBackupAction: <Button>邮箱操作</Button>,
  restoreAction: <Button>恢复操作</Button>,
};

/**
 * 渲染设置对话框后拿到的结果.
 */
interface RenderedDialog {
  /**
   * 对话框要关闭时被调用的间谍.
   */
  readonly onClose: () => void;
  /**
   * 渲染所用的偏好环境.
   */
  readonly environment: PreferencesTestEnvironment;
}

/**
 * 在偏好环境里渲染设置对话框.
 * @returns 关闭回调的间谍与偏好环境.
 */
async function renderDialog(): Promise<RenderedDialog> {
  const environment = await createPreferencesTestEnvironment();
  const onClose = vi.fn();
  render(<SettingsDialog onClose={onClose} data={TEST_ENTRIES} />, {
    wrapper: environment.Providers,
  });
  return { onClose, environment };
}

describe("设置对话框: 内容", () => {
  it("对话框有标题与说明, 里面有名为 数据 的分区", async () => {
    await renderDialog();

    const dialog = screen.getByRole("dialog", { name: "设置" });
    expect(
      within(dialog).getByText("管理数据的导入, 导出, 备份与恢复."),
    ).toBeDefined();
    expect(within(dialog).getByRole("region", { name: "数据" })).toBeDefined();
  });

  it("数据分区依次是导入, 导出, 邮箱备份, 从备份恢复四行, 每行有名称, 说明与操作", async () => {
    await renderDialog();

    const section = screen.getByRole("region", { name: "数据" });
    const text = section.textContent ?? "";
    const expectedInOrder = [
      "导入数据",
      "导入其他密码管理器导出的文件.",
      "导入操作",
      "导出数据",
      "把保险库里的条目导出成一个文件.",
      "导出操作",
      "邮箱备份",
      "把全部数据发到你自己的邮箱, 也可以设置自动备份.",
      "邮箱操作",
      "从备份恢复",
      "选择备份文件, 预览并确认后恢复数据.",
      "恢复操作",
    ];
    const positions = expectedInOrder.map((part) => text.indexOf(part));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe("设置对话框: 关闭", () => {
  it("点右上角的关闭按钮时通知调用方关闭", async () => {
    const { onClose } = await renderDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("按 Escape 时通知调用方关闭", async () => {
    const { onClose } = await renderDialog();

    await userEvent.setup().keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("设置对话框: 英文界面", () => {
  it("标题, 说明与分区标题都是英文", async () => {
    const { environment } = await renderDialog();

    await act(() => environment.i18n.changeLanguage("en"));

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(
      within(dialog).getByText(
        "Manage importing, exporting, backing up and restoring your data.",
      ),
    ).toBeDefined();
    expect(within(dialog).getByRole("region", { name: "Data" })).toBeDefined();
    expect(
      within(dialog).getByText(
        "Send all of your data to your own mailbox, or set up automatic backups.",
      ),
    ).toBeDefined();
  });
});
