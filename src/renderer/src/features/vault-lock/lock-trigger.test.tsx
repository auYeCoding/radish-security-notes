import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SidebarCollapseContext } from "@renderer/components/sidebar-collapse-context";
import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { LockTrigger } from "./lock-trigger";

/**
 * 等待悬停提示出现的最长时间, 单位毫秒, 比查询的默认超时长, 全部测试并行运行时也不误报.
 */
const TOOLTIP_WAIT_MILLISECONDS = 3000;

/**
 * 没设主密码时按钮的悬停提示.
 */
const UNAVAILABLE_TEXT =
  "未设置主密码, 锁定无法保护数据. 在设置里开启主密码后即可锁定.";

/**
 * 渲染锁定按钮后拿到的结果.
 */
interface RenderedTrigger {
  /**
   * 点击按钮时被调用的间谍.
   */
  readonly onLock: () => void;
  /**
   * 渲染所用的偏好环境.
   */
  readonly environment: PreferencesTestEnvironment;
}

/**
 * 在偏好环境里渲染锁定按钮.
 * @param isMasterPasswordMissing 是否因为没设主密码而不可用, 默认可用.
 * @param isCollapsed 侧栏是否折叠, 默认展开.
 * @returns 锁定回调的间谍与偏好环境.
 */
async function renderTrigger(
  isMasterPasswordMissing = false,
  isCollapsed = false,
): Promise<RenderedTrigger> {
  const environment = await createPreferencesTestEnvironment();
  const onLock = vi.fn();
  render(
    <SidebarCollapseContext.Provider value={isCollapsed}>
      <LockTrigger
        onLock={onLock}
        isMasterPasswordMissing={isMasterPasswordMissing}
      />
    </SidebarCollapseContext.Provider>,
    { wrapper: environment.Providers },
  );
  return { onLock, environment };
}

describe("锁定按钮", () => {
  it("按钮名称是 锁定, 有锁形图标, 点击时通知调用方锁定", async () => {
    const { onLock } = await renderTrigger();

    const button = screen.getByRole("button", { name: "锁定" });
    await userEvent.setup().click(button);

    expect(button.querySelector("svg")).not.toBeNull();
    expect(button.getAttribute("aria-disabled")).not.toBe("true");
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("界面切到英文后按钮名称是 Lock", async () => {
    const { environment } = await renderTrigger();

    await act(() => environment.i18n.changeLanguage("en"));

    expect(screen.getByRole("button", { name: "Lock" })).toBeDefined();
  });

  it("展开时文字区占满剩余宽度, 悬停没有提示", async () => {
    await renderTrigger();

    const button = screen.getByRole("button", { name: "锁定" });
    const text = button.querySelector("[data-slot='lock-trigger-text']");
    await userEvent.setup().hover(button);

    expect(text?.classList.contains("grow")).toBe(true);
    expect(text?.classList.contains("grow-0")).toBe(false);
    expect(document.querySelector("[data-slot='tooltip-content']")).toBeNull();
  });
});

describe("锁定按钮: 侧栏折叠时", () => {
  it("按钮只剩图标, 文字收窄并淡出但仍在, 名称仍是 锁定, 点击仍通知调用方", async () => {
    const { onLock } = await renderTrigger(false, true);

    const button = screen.getByRole("button", { name: "锁定" });
    const text = button.querySelector("[data-slot='lock-trigger-text']");
    await userEvent.setup().click(button);

    expect(button.querySelector("svg")).not.toBeNull();
    expect(text?.classList.contains("grow-0")).toBe(true);
    expect(text?.textContent).toBe("锁定");
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("悬停时提示 锁定", async () => {
    await renderTrigger(false, true);

    await userEvent.setup().hover(screen.getByRole("button", { name: "锁定" }));

    expect(
      await screen.findByText(
        "锁定",
        { selector: "[data-slot='tooltip-content']" },
        { timeout: TOOLTIP_WAIT_MILLISECONDS },
      ),
    ).toBeDefined();
  });
});

describe("锁定按钮: 没设主密码时不可用", () => {
  it("按钮标为不可用但仍可聚焦, 点击不通知调用方", async () => {
    const { onLock } = await renderTrigger(true);

    const button = screen.getByRole("button", { name: "锁定" });
    await userEvent.setup().click(button);
    button.focus();

    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button);
    expect(onLock).not.toHaveBeenCalled();
  });

  it("展开时悬停就提示原因", async () => {
    await renderTrigger(true);

    await userEvent.setup().hover(screen.getByRole("button", { name: "锁定" }));

    expect(
      await screen.findByText(
        UNAVAILABLE_TEXT,
        { selector: "[data-slot='tooltip-content']" },
        { timeout: TOOLTIP_WAIT_MILLISECONDS },
      ),
    ).toBeDefined();
  });

  it("折叠时悬停提示原因而不是名称", async () => {
    await renderTrigger(true, true);

    await userEvent.setup().hover(screen.getByRole("button", { name: "锁定" }));

    expect(
      await screen.findByText(
        UNAVAILABLE_TEXT,
        { selector: "[data-slot='tooltip-content']" },
        { timeout: TOOLTIP_WAIT_MILLISECONDS },
      ),
    ).toBeDefined();
  });

  it("按 Enter 也不通知调用方", async () => {
    const { onLock } = await renderTrigger(true);
    const user = userEvent.setup();

    screen.getByRole("button", { name: "锁定" }).focus();
    await user.keyboard("{Enter}");

    expect(onLock).not.toHaveBeenCalled();
  });
});
