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
 * 安全分区两行右侧的操作按钮.
 */
const TEST_SECURITY = {
  masterPasswordAction: <Button>主密码操作</Button>,
  recoveryKeyAction: <Button>恢复密钥操作</Button>,
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
  render(
    <SettingsDialog
      onClose={onClose}
      data={TEST_ENTRIES}
      security={TEST_SECURITY}
    />,
    { wrapper: environment.Providers },
  );
  return { onClose, environment };
}

describe("设置对话框: 内容", () => {
  it("对话框有标题与说明, 里面有名为 数据 的分区", async () => {
    await renderDialog();

    const dialog = screen.getByRole("dialog", { name: "设置" });
    expect(
      within(dialog).getByText(
        "管理数据的导入, 导出, 备份与恢复, 以及主密码与恢复密钥.",
      ),
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

describe("设置对话框: 安全分区", () => {
  it("数据分区之后是安全分区, 依次是主密码与恢复密钥两行, 带名称, 说明与操作", async () => {
    await renderDialog();

    const dialog = screen.getByRole("dialog", { name: "设置" });
    const regions = within(dialog).getAllByRole("region");
    expect(regions).toHaveLength(2);
    expect(regions[0]).toBe(
      within(dialog).getByRole("region", { name: "数据" }),
    );
    expect(regions[1]).toBe(
      within(dialog).getByRole("region", { name: "安全" }),
    );
    const text = regions[1].textContent ?? "";
    const expectedInOrder = [
      "主密码",
      "开启后每次启动应用都要输入主密码. 关闭后启动时直接进入, 数据文件仍然加密.",
      "主密码操作",
      "恢复密钥",
      "恢复密钥由数据密钥确定, 可随时重新查看, 内容不变.",
      "恢复密钥操作",
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
        "Manage importing, exporting, backing up and restoring your data, plus your master password and recovery key.",
      ),
    ).toBeDefined();
    expect(within(dialog).getByRole("region", { name: "Data" })).toBeDefined();
    expect(
      within(dialog).getByText(
        "Send all of your data to your own mailbox, or set up automatic backups.",
      ),
    ).toBeDefined();
  });

  it("安全分区的标题, 行名称与说明是英文", async () => {
    const { environment } = await renderDialog();

    await act(() => environment.i18n.changeLanguage("en"));

    const section = within(
      within(screen.getByRole("dialog", { name: "Settings" })).getByRole(
        "region",
        { name: "Security" },
      ),
    );
    expect(section.getByText("Master password")).toBeDefined();
    expect(
      section.getByText(
        "When on, the master password is required every time the app starts. When off, the app opens directly and your data files stay encrypted.",
      ),
    ).toBeDefined();
    expect(section.getByText("Recovery key")).toBeDefined();
    expect(
      section.getByText(
        "The recovery key is determined by your data key, so you can view it again at any time and it never changes.",
      ),
    ).toBeDefined();
  });
});
