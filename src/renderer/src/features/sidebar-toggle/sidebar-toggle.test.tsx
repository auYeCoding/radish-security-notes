import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { SidebarToggle } from "./sidebar-toggle";

/**
 * 在偏好环境里渲染切换按钮.
 * @param environmentOverrides 覆盖假偏好桥上的方法, 例如让保存失败.
 * @returns 偏好环境.
 */
async function renderToggle(
  environmentOverrides: Parameters<
    typeof createPreferencesTestEnvironment
  >[0] = {},
): Promise<PreferencesTestEnvironment> {
  const environment =
    await createPreferencesTestEnvironment(environmentOverrides);
  render(<SidebarToggle />, { wrapper: environment.Providers });
  return environment;
}

describe("侧栏切换按钮", () => {
  it("展开时名称是 收起侧栏, aria-expanded 为真", async () => {
    await renderToggle();

    const button = screen.getByRole("button", { name: "收起侧栏" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("点击后经偏好桥保存折叠, 名称变为 展开侧栏, aria-expanded 为假", async () => {
    const environment = await renderToggle();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "收起侧栏" }));

    expect(environment.bridge.setSidebarCollapsed).toHaveBeenCalledWith(true);
    const button = await screen.findByRole("button", { name: "展开侧栏" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(environment.store.getState().isSidebarCollapsed).toBe(true);
  });
});

describe("侧栏切换按钮: 恢复, 记住与语言", () => {
  it("再次点击恢复展开并保存", async () => {
    const environment = await renderToggle();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "收起侧栏" }));

    await user.click(await screen.findByRole("button", { name: "展开侧栏" }));

    expect(environment.bridge.setSidebarCollapsed).toHaveBeenLastCalledWith(
      false,
    );
    expect(
      (await screen.findByRole("button", { name: "收起侧栏" })).getAttribute(
        "aria-expanded",
      ),
    ).toBe("true");
  });

  it("偏好里已是折叠时一开始就是 展开侧栏", async () => {
    const environment = await createPreferencesTestEnvironment();
    await environment.store.getState().setSidebarCollapsed(true);
    render(<SidebarToggle />, { wrapper: environment.Providers });

    expect(
      screen
        .getByRole("button", { name: "展开侧栏" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("按钮只有图标, 界面切到英文后名称变为 Collapse sidebar", async () => {
    const environment = await renderToggle();

    await act(() => environment.i18n.changeLanguage("en"));

    const button = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")).not.toBeNull();
  });
});
