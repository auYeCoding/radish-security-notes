import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryTestEnvironmentOptions } from "@renderer/testing/entry-test-environment";
import {
  renderInEntryEnvironment,
  type RenderedInEnvironment,
} from "@renderer/testing/render-in-entry-environment";

import { MasterPasswordSwitch } from "./master-password-switch";

/**
 * 合规的新主密码.
 */
const NEW_PASSWORD = "a long enough password";

/**
 * 当前的主密码.
 */
const CURRENT_PASSWORD = "current master password";

/**
 * 在条目环境里渲染主密码开关.
 * @param options 条目环境的选项, 例如初始是否设了主密码.
 * @returns 渲染结果.
 */
function renderSwitch(
  options: EntryTestEnvironmentOptions = {},
): Promise<RenderedInEnvironment> {
  return renderInEntryEnvironment(() => <MasterPasswordSwitch />, options);
}

describe("主密码开关: 反映当前模式", () => {
  it("没设主密码时开关为关, 名称是 未开启", async () => {
    await renderSwitch({ hasMasterPassword: false });

    const toggle = await screen.findByRole("switch", { name: "未开启" });

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("group", { name: "主密码" })).toBeDefined();
  });

  it("设了主密码时开关为开, 名称是 已开启", async () => {
    await renderSwitch({ hasMasterPassword: true });

    const toggle = await screen.findByRole("switch", { name: "已开启" });

    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("读取失败时开关不可改, 名称是 无法读取, 点击不打开对话框", async () => {
    await renderSwitch({
      masterPasswordBridgeOverrides: {
        hasMasterPassword: () => Promise.reject(new Error("通道断开")),
      },
    });

    const toggle = await screen.findByRole("switch", { name: "无法读取" });
    await userEvent.setup().click(toggle);

    expect(toggle.hasAttribute("data-disabled")).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("切到英文后名称是英文", async () => {
    const { environment } = await renderSwitch({ hasMasterPassword: true });
    await screen.findByRole("switch", { name: "已开启" });

    await act(() => environment.i18n.changeLanguage("en"));

    expect(screen.getByRole("switch", { name: "On" })).toBeDefined();
    expect(
      screen.getByRole("group", { name: "Master password" }),
    ).toBeDefined();
  });
});

describe("主密码开关: 开启", () => {
  it("点开关打开开启对话框, 开关仍保持关, 此时不调用桥", async () => {
    const { environment } = await renderSwitch({ hasMasterPassword: false });

    await userEvent
      .setup()
      .click(await screen.findByRole("switch", { name: "未开启" }));

    expect(
      await screen.findByRole("dialog", { name: "开启主密码" }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("switch", { name: "未开启", hidden: true })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(environment.masterPasswordBridge.enable).not.toHaveBeenCalled();
  });

  it("取消后关闭对话框, 开关保持关", async () => {
    await renderSwitch({ hasMasterPassword: false });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("switch", { name: "未开启" }));

    await user.click(await screen.findByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen
        .getByRole("switch", { name: "未开启" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });
});

describe("主密码开关: 开启的结果", () => {
  it("设置成功后对话框关闭, 重新读取后开关变为开", async () => {
    const { environment } = await renderSwitch({ hasMasterPassword: false });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("switch", { name: "未开启" }));
    const dialog = within(
      await screen.findByRole("dialog", { name: "开启主密码" }),
    );

    await user.type(dialog.getByLabelText("主密码"), NEW_PASSWORD);
    await user.type(dialog.getByLabelText("确认主密码"), NEW_PASSWORD);
    await user.click(dialog.getByRole("button", { name: "开启主密码" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      (await screen.findByRole("switch", { name: "已开启" })).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
    expect(environment.masterPasswordBridge.enable).toHaveBeenCalledWith(
      NEW_PASSWORD,
    );
    expect(
      environment.masterPasswordBridge.hasMasterPassword,
    ).toHaveBeenCalledTimes(2);
  });

  it("设置失败时对话框保持打开, 关掉后开关仍为关", async () => {
    await renderSwitch({
      hasMasterPassword: false,
      masterPasswordBridgeOverrides: {
        enable: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("switch", { name: "未开启" }));
    const dialog = within(
      await screen.findByRole("dialog", { name: "开启主密码" }),
    );

    await user.type(dialog.getByLabelText("主密码"), NEW_PASSWORD);
    await user.type(dialog.getByLabelText("确认主密码"), NEW_PASSWORD);
    await user.click(dialog.getByRole("button", { name: "开启主密码" }));
    await dialog.findByRole("alert");
    await user.click(dialog.getByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen
        .getByRole("switch", { name: "未开启" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });
});

describe("主密码开关: 关闭", () => {
  it("点开关打开关闭对话框, 开关仍保持开, 此时不调用桥", async () => {
    const { environment } = await renderSwitch({ hasMasterPassword: true });

    await userEvent
      .setup()
      .click(await screen.findByRole("switch", { name: "已开启" }));

    expect(
      await screen.findByRole("dialog", { name: "关闭主密码" }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("switch", { name: "已开启", hidden: true })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(environment.masterPasswordBridge.disable).not.toHaveBeenCalled();
  });
});

describe("主密码开关: 关闭的结果", () => {
  it("确认成功后对话框关闭, 重新读取后开关变为关", async () => {
    const { environment } = await renderSwitch({ hasMasterPassword: true });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("switch", { name: "已开启" }));
    const dialog = within(
      await screen.findByRole("dialog", { name: "关闭主密码" }),
    );

    await user.type(dialog.getByLabelText("当前主密码"), CURRENT_PASSWORD);
    await user.click(
      dialog.getByRole("checkbox", { name: "我了解关闭后的保护强度" }),
    );
    await user.click(dialog.getByRole("button", { name: "关闭主密码" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      (await screen.findByRole("switch", { name: "未开启" })).getAttribute(
        "aria-checked",
      ),
    ).toBe("false");
    expect(environment.masterPasswordBridge.disable).toHaveBeenCalledWith(
      CURRENT_PASSWORD,
    );
  });

  it("当前主密码错误时对话框保持打开, 开关仍为开", async () => {
    await renderSwitch({
      hasMasterPassword: true,
      masterPasswordBridgeOverrides: {
        disable: () => Promise.resolve({ ok: false, reason: "wrong-password" }),
      },
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("switch", { name: "已开启" }));
    const dialog = within(
      await screen.findByRole("dialog", { name: "关闭主密码" }),
    );

    await user.type(dialog.getByLabelText("当前主密码"), CURRENT_PASSWORD);
    await user.click(
      dialog.getByRole("checkbox", { name: "我了解关闭后的保护强度" }),
    );
    await user.click(dialog.getByRole("button", { name: "关闭主密码" }));

    expect(await dialog.findByText("主密码不正确, 请重新输入.")).toBeDefined();
    expect(
      screen
        .getByRole("switch", { name: "已开启", hidden: true })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});
