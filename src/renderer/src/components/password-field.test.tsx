import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import { PasswordField } from "./password-field";

/**
 * 在偏好环境里渲染密码字段.
 * @param props 要传给密码字段的属性.
 */
async function renderField(
  props: Partial<React.ComponentProps<typeof PasswordField>> = {},
): Promise<void> {
  const { Providers } = await createPreferencesTestEnvironment();
  render(<PasswordField label="主密码" {...props} />, { wrapper: Providers });
}

describe("PasswordField 显示与隐藏", () => {
  it("默认以密码形式隐藏输入内容", async () => {
    await renderField();

    expect(screen.getByLabelText("主密码").getAttribute("type")).toBe(
      "password",
    );
  });

  it("点击切换按钮显示明文, 再点击恢复隐藏, 按钮名称随之变化", async () => {
    await renderField();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "显示密码" }));
    expect(screen.getByLabelText("主密码").getAttribute("type")).toBe("text");

    await user.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect(screen.getByLabelText("主密码").getAttribute("type")).toBe(
      "password",
    );
  });

  it("输入的内容在切换显示状态后保留", async () => {
    await renderField();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("主密码"), "secret-value");
    await user.click(screen.getByRole("button", { name: "显示密码" }));

    expect(screen.getByDisplayValue("secret-value")).toBeDefined();
  });
});

describe("PasswordField 说明与错误", () => {
  it("显示说明文字, 并挂在输入框的无障碍描述上", async () => {
    await renderField({ description: "至少 8 个字符" });

    const input = screen.getByLabelText("主密码");
    const description = screen.getByText("至少 8 个字符");
    expect(input.getAttribute("aria-describedby")).toBe(description.id);
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("有错误时输入框标红, 错误以 alert 角色显示并挂在无障碍描述上", async () => {
    await renderField({ description: "说明", error: "出错了" });

    const input = screen.getByLabelText("主密码");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("出错了");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });
});
