import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_AUTO_LOCK_SETTINGS,
  type AutoLockSettings,
} from "@shared/preferences/auto-lock-settings";
import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { AutoLockIdleControls } from "./auto-lock-idle-controls";
import { AutoLockToggle } from "./auto-lock-toggle";

/**
 * 渲染空闲控件与另两个开关, 放在同一页里.
 * @param isDisabled 自动锁定是否不可用.
 * @returns 偏好环境.
 */
async function renderControls(
  isDisabled = false,
): Promise<PreferencesTestEnvironment> {
  const environment = await createPreferencesTestEnvironment();
  render(
    <>
      <AutoLockIdleControls isDisabled={isDisabled} />
      <AutoLockToggle
        settingKey="isScreenLockEnabled"
        isDisabled={isDisabled}
      />
      <AutoLockToggle settingKey="isSleepLockEnabled" isDisabled={isDisabled} />
    </>,
    { wrapper: environment.Providers },
  );
  return environment;
}

/**
 * 按所属设置行的名称取出一个开关.
 * @param groupName 开关分组的名称.
 * @returns 开关元素.
 */
function getSwitch(groupName: string): HTMLElement {
  return within(screen.getByRole("group", { name: groupName })).getByRole(
    "switch",
    { name: "启用" },
  );
}

/**
 * 判断空闲时长下拉当前是否不可改.
 * @returns 不可改时为 true.
 */
function isMinutesSelectDisabled(): boolean {
  return screen
    .getByRole("combobox", { name: "空闲时长" })
    .hasAttribute("data-disabled");
}

describe("自动锁定控件: 显示偏好里的当前值", () => {
  it("默认三个开关都是开的, 时长是 15 分钟", async () => {
    await renderControls();

    for (const name of ["空闲自动锁定", "锁屏时锁定", "休眠时锁定"]) {
      expect(getSwitch(name).getAttribute("aria-checked")).toBe("true");
    }
    expect(
      screen.getByRole("combobox", { name: "空闲时长" }).textContent,
    ).toContain("15 分钟");
  });

  it("偏好里是关的开关显示为关", async () => {
    const environment = await createPreferencesTestEnvironment();
    await environment.store.getState().setAutoLock({
      ...DEFAULT_AUTO_LOCK_SETTINGS,
      isScreenLockEnabled: false,
    });
    render(
      <AutoLockToggle settingKey="isScreenLockEnabled" isDisabled={false} />,
      { wrapper: environment.Providers },
    );

    expect(getSwitch("锁屏时锁定").getAttribute("aria-checked")).toBe("false");
  });
});

describe("自动锁定控件: 修改立即保存", () => {
  it.each([
    ["空闲自动锁定", "isIdleLockEnabled"],
    ["锁屏时锁定", "isScreenLockEnabled"],
    ["休眠时锁定", "isSleepLockEnabled"],
  ] as const)("点 %s 的开关保存整个设置, 只改对应字段", async (name, key) => {
    const environment = await renderControls();

    await userEvent.setup().click(getSwitch(name));

    await waitFor(() =>
      expect(environment.bridge.setAutoLock).toHaveBeenCalledWith({
        ...DEFAULT_AUTO_LOCK_SETTINGS,
        [key]: false,
      }),
    );
    expect(environment.store.getState().autoLock[key]).toBe(false);
    expect(getSwitch(name).getAttribute("aria-checked")).toBe("false");
  });

  it("选另一个时长保存新时长, 其余字段不变", async () => {
    const environment = await renderControls();
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "空闲时长" }));
    await user.click(await screen.findByRole("option", { name: "30 分钟" }));

    await waitFor(() =>
      expect(environment.bridge.setAutoLock).toHaveBeenCalledWith({
        ...DEFAULT_AUTO_LOCK_SETTINGS,
        idleMinutes: 30,
      }),
    );
  });
});

describe("自动锁定控件: 时长下拉与保存失败", () => {
  it("时长下拉的选项是 1, 5, 15, 30, 60 分钟", async () => {
    await renderControls();
    await userEvent
      .setup()
      .click(screen.getByRole("combobox", { name: "空闲时长" }));

    const options = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );

    expect(options).toEqual([
      "1 分钟",
      "5 分钟",
      "15 分钟",
      "30 分钟",
      "60 分钟",
    ]);
  });

  it("主进程保存失败时界面保持原值", async () => {
    const environment = await createPreferencesTestEnvironment({
      setAutoLock: vi.fn(() => Promise.reject(new Error("保存失败"))),
    });
    render(
      <AutoLockToggle settingKey="isSleepLockEnabled" isDisabled={false} />,
      {
        wrapper: environment.Providers,
      },
    );

    await userEvent.setup().click(getSwitch("休眠时锁定"));
    await waitFor(() =>
      expect(environment.bridge.setAutoLock).toHaveBeenCalledTimes(1),
    );

    expect(getSwitch("休眠时锁定").getAttribute("aria-checked")).toBe("true");
    expect(environment.store.getState().autoLock).toEqual(
      DEFAULT_AUTO_LOCK_SETTINGS,
    );
  });
});

describe("自动锁定控件: 联动与不可用", () => {
  it("空闲开关关闭后时长下拉不可改, 重新打开后可改", async () => {
    await renderControls();
    const user = userEvent.setup();

    await user.click(getSwitch("空闲自动锁定"));
    await waitFor(() => expect(isMinutesSelectDisabled()).toBe(true));

    await user.click(getSwitch("空闲自动锁定"));
    await waitFor(() => expect(isMinutesSelectDisabled()).toBe(false));
  });

  it("自动锁定不可用时三个开关与时长下拉都不可改, 点击也不保存", async () => {
    const environment = await renderControls(true);

    for (const name of ["空闲自动锁定", "锁屏时锁定", "休眠时锁定"]) {
      expect(getSwitch(name).getAttribute("aria-disabled")).toBe("true");
      await userEvent.setup().click(getSwitch(name));
    }

    expect(isMinutesSelectDisabled()).toBe(true);
    expect(environment.bridge.setAutoLock).not.toHaveBeenCalled();
  });
});

describe("自动锁定控件: 英文界面", () => {
  it("开关分组与时长下拉随界面语言变化, 时长按复数显示", async () => {
    const environment = await renderControls();
    const settings: AutoLockSettings = {
      ...DEFAULT_AUTO_LOCK_SETTINGS,
      idleMinutes: 1,
    };
    await act(() => environment.store.getState().setAutoLock(settings));

    await act(() => environment.i18n.changeLanguage("en"));

    expect(
      within(screen.getByRole("group", { name: "Lock when idle" })).getByRole(
        "switch",
        { name: "Enabled" },
      ),
    ).toBeDefined();
    expect(
      screen.getByRole("combobox", { name: "Idle time" }).textContent,
    ).toContain("1 minute");
  });
});
