import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TextareaField } from "./textarea-field";

describe("TextareaField", () => {
  it("标签与多行输入框关联, 输入的换行原样保留", async () => {
    render(<TextareaField label="备注" />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("备注"), "第一行{Enter}第二行");

    expect(screen.getByLabelText("备注").tagName).toBe("TEXTAREA");
    expect((screen.getByLabelText("备注") as HTMLTextAreaElement).value).toBe(
      "第一行\n第二行",
    );
  });

  it("沿用多行输入框的原生属性", () => {
    render(<TextareaField label="备注" name="notes" autoComplete="off" />);

    const textarea = screen.getByLabelText("备注");
    expect(textarea.getAttribute("name")).toBe("notes");
    expect(textarea.getAttribute("autocomplete")).toBe("off");
  });

  it("没有错误时不标红", () => {
    render(<TextareaField label="备注" />);

    const textarea = screen.getByLabelText("备注");
    expect(textarea.getAttribute("aria-invalid")).toBe("false");
    expect(textarea.getAttribute("aria-describedby")).toBeNull();
  });

  it("有错误时标红, 错误以 alert 角色显示并挂在无障碍描述上", () => {
    render(<TextareaField label="备注" error="出错了" />);

    const textarea = screen.getByLabelText("备注");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("出错了");
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")).toBe(alert.id);
  });
});
