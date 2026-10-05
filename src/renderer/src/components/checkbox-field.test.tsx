import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckboxField } from "./checkbox-field";

describe("CheckboxField: 勾选", () => {
  it("标签是复选框的无障碍名称, 点复选框以新的勾选状态调用回调", async () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField
        label="包含附件"
        isChecked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("checkbox", { name: "包含附件" }));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it("勾选状态由属性决定", () => {
    render(
      <CheckboxField label="包含附件" isChecked onCheckedChange={vi.fn()} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "包含附件" });
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("不可改时点击不触发回调", async () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField
        label="包含附件"
        isChecked={false}
        isDisabled
        onCheckedChange={onCheckedChange}
      />,
    );
    const checkbox = screen.getByRole("checkbox", { name: "包含附件" });

    await userEvent.setup().click(checkbox);

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(checkbox.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("CheckboxField: 说明", () => {
  it("给了说明时挂在复选框的无障碍描述上", () => {
    render(
      <CheckboxField
        label="包含附件"
        description="附件原样放进文件."
        isChecked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "包含附件" });
    const descriptionId = checkbox.getAttribute("aria-describedby");
    expect(descriptionId).not.toBeNull();
    expect(document.getElementById(descriptionId ?? "")?.textContent).toBe(
      "附件原样放进文件.",
    );
  });

  it("没给说明时不挂无障碍描述", () => {
    render(
      <CheckboxField
        label="包含附件"
        isChecked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "包含附件" });
    expect(checkbox.getAttribute("aria-describedby")).toBeNull();
  });
});
