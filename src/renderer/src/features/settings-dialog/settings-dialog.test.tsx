import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@renderer/components/ui/button";
import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { SettingsDialog } from "./settings-dialog";
import { SETTINGS_DIALOG_BODY_SLOT } from "./settings-dialog-body-slot";
import type { SettingsSecurityEntries } from "./settings-security-section";

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
 * 安全分区五行右侧的操作按钮, 自动锁定可用.
 */
const TEST_SECURITY: SettingsSecurityEntries = {
  masterPasswordAction: <Button>主密码操作</Button>,
  recoveryKeyAction: <Button>恢复密钥操作</Button>,
  idleLockAction: <Button>空闲锁定操作</Button>,
  screenLockAction: <Button>锁屏锁定操作</Button>,
  sleepLockAction: <Button>休眠锁定操作</Button>,
  isAutoLockUnavailable: false,
};

/**
 * 外观与语言分区两行右侧的操作按钮.
 */
const TEST_APPEARANCE = {
  themeAction: <Button>主题操作</Button>,
  languageAction: <Button>语言操作</Button>,
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
 * @param security 安全分区的操作元素, 默认是自动锁定可用的那一组.
 * @returns 关闭回调的间谍与偏好环境.
 */
async function renderDialog(
  security: SettingsSecurityEntries = TEST_SECURITY,
): Promise<RenderedDialog> {
  const environment = await createPreferencesTestEnvironment();
  const onClose = vi.fn();
  render(
    <SettingsDialog
      onClose={onClose}
      appearance={TEST_APPEARANCE}
      data={TEST_ENTRIES}
      security={security}
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
        "管理外观与语言, 数据的导入, 导出, 备份与恢复, 以及主密码与恢复密钥.",
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
    expect(regions).toHaveLength(3);
    expect(regions[1]).toBe(
      within(dialog).getByRole("region", { name: "数据" }),
    );
    expect(regions[2]).toBe(
      within(dialog).getByRole("region", { name: "安全" }),
    );
    const text = regions[2].textContent ?? "";
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

describe("设置对话框: 安全分区的自动锁定", () => {
  it("主密码与恢复密钥之后依次是空闲, 锁屏, 休眠三行, 带名称, 说明与操作", async () => {
    await renderDialog();

    const text = screen.getByRole("region", { name: "安全" }).textContent ?? "";
    const expectedInOrder = [
      "恢复密钥操作",
      "空闲自动锁定",
      "整个 Windows 会话的键盘鼠标空闲达到设定时长后自动锁定, 之后要重新输入主密码.",
      "空闲锁定操作",
      "锁屏时锁定",
      "Windows 锁屏时自动锁定保险库.",
      "锁屏锁定操作",
      "休眠时锁定",
      "Windows 进入睡眠或休眠时自动锁定保险库.",
      "休眠锁定操作",
    ];
    const positions = expectedInOrder.reduce<number[]>((found, part) => {
      const [previous = -1] = found.slice(-1);
      return [...found, text.indexOf(part, previous + 1)];
    }, []);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe("设置对话框: 安全分区的自动锁定不可用", () => {
  it("自动锁定可用时没有不可用的原因说明", async () => {
    await renderDialog();

    expect(
      screen.queryByText("未设置主密码, 自动锁定不会生效. 先在上方开启主密码."),
    ).toBeNull();
  });

  it("自动锁定不可用时三行之后有一行原因说明", async () => {
    await renderDialog({ ...TEST_SECURITY, isAutoLockUnavailable: true });

    const note = screen.getByRole("note");
    const section = screen.getByRole("region", { name: "安全" });

    expect(note.textContent).toBe(
      "未设置主密码, 自动锁定不会生效. 先在上方开启主密码.",
    );
    expect(section.contains(note)).toBe(true);
    expect((section.textContent ?? "").indexOf("休眠锁定操作")).toBeLessThan(
      (section.textContent ?? "").indexOf(note.textContent ?? ""),
    );
  });

  it("英文界面下自动锁定三行的名称, 说明与原因都是英文", async () => {
    const { environment } = await renderDialog({
      ...TEST_SECURITY,
      isAutoLockUnavailable: true,
    });

    await act(() => environment.i18n.changeLanguage("en"));

    const section = within(screen.getByRole("region", { name: "Security" }));
    expect(section.getByText("Lock when idle")).toBeDefined();
    expect(section.getByText("Lock when the screen locks")).toBeDefined();
    expect(section.getByText("Lock when the system sleeps")).toBeDefined();
    expect(
      section.getByText("Locks the vault when Windows locks the screen."),
    ).toBeDefined();
    expect(
      section.getByText(
        "No master password is set, so auto-lock has no effect. Turn on the master password above first.",
      ),
    ).toBeDefined();
  });
});

describe("设置对话框: 外观与语言分区", () => {
  it("外观与语言分区排在最前, 依次是主题与语言两行, 带名称, 说明与操作", async () => {
    await renderDialog();

    const dialog = screen.getByRole("dialog", { name: "设置" });
    const regions = within(dialog).getAllByRole("region");
    expect(regions[0]).toBe(
      within(dialog).getByRole("region", { name: "外观与语言" }),
    );
    const text = regions[0].textContent ?? "";
    const expectedInOrder = [
      "外观与语言",
      "主题",
      "选择浅色, 深色或跟随系统.",
      "主题操作",
      "语言",
      "选择界面语言.",
      "语言操作",
    ];
    const positions = expectedInOrder.reduce<number[]>((found, part) => {
      const [previous = -1] = found.slice(-1);
      return [...found, text.indexOf(part, previous + 1)];
    }, []);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("三个分区放在对话框内部可纵向滚动的内容区里, 标题与说明在内容区之外", async () => {
    await renderDialog();

    const dialog = screen.getByRole("dialog", { name: "设置" });
    const body = dialog.querySelector(
      `[data-slot='${SETTINGS_DIALOG_BODY_SLOT}']`,
    );
    expect(body?.classList.contains("overflow-y-auto")).toBe(true);
    expect(dialog.classList.contains("max-h-11/12")).toBe(true);
    expect(within(dialog).getAllByRole("region")).toHaveLength(3);
    within(dialog)
      .getAllByRole("region")
      .forEach((region) => expect(body?.contains(region)).toBe(true));
    expect(body?.contains(within(dialog).getByText("设置"))).toBe(false);
    expect(
      body?.contains(
        within(dialog).getByText(
          "管理外观与语言, 数据的导入, 导出, 备份与恢复, 以及主密码与恢复密钥.",
        ),
      ),
    ).toBe(false);
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
        "Manage appearance and language, importing, exporting, backing up and restoring your data, plus your master password and recovery key.",
      ),
    ).toBeDefined();
    expect(within(dialog).getByRole("region", { name: "Data" })).toBeDefined();
    expect(
      within(dialog).getByText(
        "Send all of your data to your own mailbox, or set up automatic backups.",
      ),
    ).toBeDefined();
  });

  it("外观与语言分区的标题, 行名称与说明是英文", async () => {
    const { environment } = await renderDialog();

    await act(() => environment.i18n.changeLanguage("en"));

    const section = within(
      within(screen.getByRole("dialog", { name: "Settings" })).getByRole(
        "region",
        { name: "Appearance and language" },
      ),
    );
    expect(section.getByText("Theme")).toBeDefined();
    expect(
      section.getByText("Choose light, dark or follow the system."),
    ).toBeDefined();
    expect(section.getByText("Language")).toBeDefined();
    expect(section.getByText("Choose the interface language.")).toBeDefined();
  });
});

describe("设置对话框: 英文界面的安全分区", () => {
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
