import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { ContentProtectionToggle } from "./content-protection-toggle";

/**
 * 渲染内容保护开关.
 * @param bridgeOverrides 覆盖假偏好桥上的方法, 例如让保存失败.
 * @returns 偏好环境.
 */
async function renderToggle(
  bridgeOverrides: Parameters<typeof createPreferencesTestEnvironment>[0] = {},
): Promise<PreferencesTestEnvironment> {
  const environment = await createPreferencesTestEnvironment(bridgeOverrides);
  render(<ContentProtectionToggle />, { wrapper: environment.Providers });
  return environment;
}

/**
 * 取出内容保护开关.
 * @returns 开关元素.
 */
function getSwitch(): HTMLElement {
  return within(screen.getByRole("group", { name: "内容保护" })).getByRole(
    "switch",
    { name: "启用" },
  );
}

describe("内容保护开关", () => {
  it("默认是关的, 开关旁固定写 启用", async () => {
    await renderToggle();

    expect(getSwitch().getAttribute("aria-checked")).toBe("false");
  });

  it("点击后经桥保存并变为开, 再点击关闭也保存", async () => {
    const { bridge, store } = await renderToggle();
    const user = userEvent.setup();

    await user.click(getSwitch());
    await waitFor(() =>
      expect(store.getState().isContentProtectionEnabled).toBe(true),
    );
    expect(bridge.setContentProtection).toHaveBeenLastCalledWith(true);
    expect(getSwitch().getAttribute("aria-checked")).toBe("true");

    await user.click(getSwitch());

    await waitFor(() =>
      expect(store.getState().isContentProtectionEnabled).toBe(false),
    );
    expect(bridge.setContentProtection).toHaveBeenLastCalledWith(false);
  });

  it("偏好里已是开时一开始就是开", async () => {
    const environment = await createPreferencesTestEnvironment();
    await environment.store.getState().setContentProtectionEnabled(true);
    render(<ContentProtectionToggle />, { wrapper: environment.Providers });

    expect(getSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("桥拒绝保存时开关保持原值, 不产生未处理的拒绝", async () => {
    const setContentProtection = vi.fn(() =>
      Promise.reject(new Error("ipc down")),
    );
    await renderToggle({ setContentProtection });

    await userEvent.setup().click(getSwitch());

    await waitFor(() =>
      expect(setContentProtection).toHaveBeenCalledWith(true),
    );
    expect(getSwitch().getAttribute("aria-checked")).toBe("false");
  });

  it("界面切到英文后分组名称随语言, 开关旁文字也是英文", async () => {
    const environment = await renderToggle();

    await act(() => environment.i18n.changeLanguage("en"));

    const group = screen.getByRole("group", { name: "Content protection" });
    expect(
      within(group).getByRole("switch", { name: "Enabled" }),
    ).toBeDefined();
  });
});
