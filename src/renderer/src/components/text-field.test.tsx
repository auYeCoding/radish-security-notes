import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "./text-field";

describe("TextField 说明与错误", () => {
  it("有说明时显示在输入框下方并挂在无障碍描述上", () => {
    render(<TextField label="邮箱" description="同时是用户名" />);
    const input = screen.getByLabelText("邮箱");
    const description = screen.getByText("同时是用户名");
    expect(input.getAttribute("aria-describedby")).toBe(description.id);
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("有错误时输入框标红, 无障碍描述指向错误而不是说明", () => {
    render(
      <TextField label="邮箱" description="同时是用户名" error="格式不对" />,
    );
    const input = screen.getByLabelText("邮箱");
    expect(screen.getByText("格式不对")).toBeDefined();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(
      screen.getByText("格式不对").id,
    );
  });

  it("没有说明也没有错误时没有无障碍描述", () => {
    render(<TextField label="邮箱" />);
    expect(screen.getByLabelText("邮箱").hasAttribute("aria-describedby")).toBe(
      false,
    );
  });
});
