import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@renderer/components/ui/tooltip";
import {
  isDialogMounted,
  openSettingsDialogWith,
} from "@renderer/testing/open-settings-dialog";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { AppShell } from "./app-shell";
import { SettingsEntry } from "./settings-entry";

/**
 * 生成设置入口元素.
 * @returns 设置入口元素.
 */
function createEntry(): React.ReactElement {
  return <SettingsEntry />;
}

/**
 * 生成三栏主界面元素.
 * @returns 三栏主界面元素.
 */
function createShell(): React.ReactElement {
  return <AppShell />;
}

/**
 * 取设置对话框里的外观与语言分区.
 * @param name 分区在当前界面语言下的标题.
 * @returns 限定在该分区内的查询.
 */
function appearanceSection(name: string): ReturnType<typeof within> {
  return within(screen.getByRole("region", { name }));
}

/**
 * 读取一个分段按钮的选中状态.
 * @param scope 限定查询的范围.
 * @param name 按钮的可访问名称.
 * @returns aria-pressed 的取值.
 */
function pressedStateOf(
  scope: ReturnType<typeof within>,
  name: string,
): string | null {
  return scope.getByRole("button", { name }).getAttribute("aria-pressed");
}

/**
 * 等待悬停提示出现的最长时间, 单位毫秒, 比查询的默认超时长, 全部测试并行运行时也不误报.
 */
const TOOLTIP_WAIT_MILLISECONDS = 3000;

/**
 * 生成设置入口元素, 外包悬停提示的上下文提供者, 与应用根部的装配一致.
 * @returns 带悬停提示上下文的设置入口元素.
 */
function createEntryWithTooltips(): React.ReactElement {
  return (
    <TooltipProvider>
      <SettingsEntry />
    </TooltipProvider>
  );
}

/**
 * 依次悬停到名称为指定文字的分段按钮上, 断言悬停前页面里没有该文字, 悬停后出现悬停提示,
 * 移开指针后提示消失.
 * @param user 用户操作模拟器.
 * @param scope 限定查询的范围.
 * @param tooltipTexts 各按钮的悬停提示文字, 同时是按钮的可访问名称.
 */
async function expectTooltipsOnHover(
  user: UserEvent,
  scope: ReturnType<typeof within>,
  tooltipTexts: readonly string[],
): Promise<void> {
  for (const tooltipText of tooltipTexts) {
    const button = scope.getByRole("button", { name: tooltipText });
    expect(screen.queryByText(tooltipText)).toBeNull();
    await user.hover(button);
    expect(
      await screen.findByText(
        tooltipText,
        {},
        { timeout: TOOLTIP_WAIT_MILLISECONDS },
      ),
    ).toBeDefined();
    await user.unhover(button);
    await waitFor(() => expect(screen.queryByText(tooltipText)).toBeNull());
  }
}

describe("设置入口: 外观与语言分区", () => {
  it("外观与语言分区排在标签, 数据与安全之前, 主题三档与语言两档按偏好标出选中项", async () => {
    await openSettingsDialogWith(createEntry);

    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(4);
    expect(regions[0]).toBe(screen.getByRole("region", { name: "外观与语言" }));
    const section = appearanceSection("外观与语言");
    expect(section.getByRole("group", { name: "主题" })).toBeDefined();
    expect(section.getByRole("group", { name: "语言" })).toBeDefined();
    expect(pressedStateOf(section, "跟随系统")).toBe("true");
    expect(pressedStateOf(section, "浅色")).toBe("false");
    expect(pressedStateOf(section, "深色")).toBe("false");
    expect(pressedStateOf(section, "简体中文")).toBe("true");
    expect(pressedStateOf(section, "English")).toBe("false");
  });

  it("点选主题后经偏好桥保存, 选中项更新, 设置对话框保持打开", async () => {
    const environment = await openSettingsDialogWith(createEntry);

    await userEvent
      .setup()
      .click(
        appearanceSection("外观与语言").getByRole("button", { name: "深色" }),
      );

    await waitFor(() => {
      expect(environment.store.getState().themeSource).toBe("dark");
    });
    expect(environment.bridge.setThemeSource).toHaveBeenCalledWith("dark");
    expect(pressedStateOf(appearanceSection("外观与语言"), "深色")).toBe(
      "true",
    );
    expect(isDialogMounted("设置")).toBe(true);
  });

  it("在对话框外改变偏好时, 对话框里的选中项同步", async () => {
    const environment = await openSettingsDialogWith(createEntry);

    await act(() => environment.store.getState().setThemeSource("light"));

    expect(pressedStateOf(appearanceSection("外观与语言"), "浅色")).toBe(
      "true",
    );
    expect(pressedStateOf(appearanceSection("外观与语言"), "跟随系统")).toBe(
      "false",
    );
  });
});

describe("设置入口: 语言切换", () => {
  it("点选语言后经偏好桥保存, 对话框文案立即变成英文, 按钮内容不变, 对话框保持打开", async () => {
    const environment = await openSettingsDialogWith(createEntry);

    await userEvent.setup().click(
      appearanceSection("外观与语言").getByRole("button", {
        name: "English",
      }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    expect(environment.bridge.setLanguage).toHaveBeenCalledWith("en");
    const section = within(
      within(dialog).getByRole("region", { name: "Appearance and language" }),
    );
    expect(section.getByText("Theme")).toBeDefined();
    expect(section.getByRole("group", { name: "Theme" })).toBeDefined();
    expect(section.getByRole("group", { name: "Language" })).toBeDefined();
    expect(pressedStateOf(section, "English")).toBe("true");
    expect(section.getByRole("button", { name: "English" }).textContent).toBe(
      "EN",
    );
    expect(section.getByRole("button", { name: "简体中文" }).textContent).toBe(
      "中",
    );
    expect(section.getByRole("button", { name: "System" })).toBeDefined();
    expect(isDialogMounted("Settings")).toBe(true);
  });

  it("切回简体中文后对话框文案恢复中文", async () => {
    await openSettingsDialogWith(createEntry);
    const user = userEvent.setup();
    await user.click(
      appearanceSection("外观与语言").getByRole("button", { name: "English" }),
    );
    await screen.findByRole("dialog", { name: "Settings" });

    await user.click(
      appearanceSection("Appearance and language").getByRole("button", {
        name: "简体中文",
      }),
    );

    expect(await screen.findByRole("dialog", { name: "设置" })).toBeDefined();
    expect(screen.getByRole("region", { name: "外观与语言" })).toBeDefined();
  });
});

describe("设置入口: 打开时的焦点", () => {
  it("打开设置后焦点在对话框面板上, 不弹出悬停提示, 按一次 Escape 就关闭", async () => {
    await openSettingsDialogWith(createEntry);

    const dialog = screen.getByRole("dialog", { name: "设置" });
    expect(document.activeElement).toBe(dialog);
    expect(document.querySelector("[data-slot='tooltip-content']")).toBeNull();
    await userEvent.setup().keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("设置入口: 悬停提示", () => {
  it("中文界面下, 主题三档与语言两档悬停时显示各自的名称", async () => {
    await openSettingsDialogWith(createEntryWithTooltips);

    await expectTooltipsOnHover(
      userEvent.setup(),
      appearanceSection("外观与语言"),
      ["跟随系统", "浅色", "深色", "简体中文", "English"],
    );
  });

  it("点选 English 后, 同一个对话框里主题三档的悬停提示由中文变成英文, 语言两档保持自称", async () => {
    await openSettingsDialogWith(createEntryWithTooltips);
    const user = userEvent.setup();
    await expectTooltipsOnHover(user, appearanceSection("外观与语言"), [
      "浅色",
    ]);

    const english = appearanceSection("外观与语言").getByRole("button", {
      name: "English",
    });
    await user.click(english);
    await user.unhover(english);
    await screen.findByRole("dialog", { name: "Settings" });

    await expectTooltipsOnHover(
      user,
      appearanceSection("Appearance and language"),
      ["System", "Light", "Dark", "简体中文", "English"],
    );
  });
});

describe("设置入口: 顶栏保留, 与设置里的控件读写同一份偏好", () => {
  it("在设置里点选深色后, 关闭对话框, 顶栏的深色按钮是选中项", async () => {
    await openSettingsDialogWith(createShell);
    const user = userEvent.setup();

    await user.click(
      appearanceSection("外观与语言").getByRole("button", { name: "深色" }),
    );
    await user.click(screen.getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const topbar = within(screen.getByRole("banner"));
    expect(pressedStateOf(topbar, "深色")).toBe("true");
    expect(pressedStateOf(topbar, "跟随系统")).toBe("false");
  });

  it("在顶栏点选 English 后打开设置, 对话框里是英文且 English 是选中项", async () => {
    await renderInEntryEnvironment(createShell);
    const user = userEvent.setup();

    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "English",
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Settings" }));

    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    const section = within(
      within(dialog).getByRole("region", { name: "Appearance and language" }),
    );
    expect(pressedStateOf(section, "English")).toBe("true");
  });
});
