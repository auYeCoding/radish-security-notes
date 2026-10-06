import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SwitchField } from "./switch-field";

describe("SwitchField: 开关", () => {
  it("标签是开关的无障碍名称, 点开关以新的状态调用回调", async () => {
    const onCheckedChange = vi.fn();
    render(
      <SwitchField
        label="自动备份"
        isChecked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("switch", { name: "自动备份" }));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it("开关状态由属性决定", () => {
    render(
      <SwitchField label="自动备份" isChecked onCheckedChange={vi.fn()} />,
    );

    const toggle = screen.getByRole("switch", { name: "自动备份" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("不可改时点击不触发回调", async () => {
    const onCheckedChange = vi.fn();
    render(
      <SwitchField
        label="自动备份"
        isChecked={false}
        isDisabled
        onCheckedChange={onCheckedChange}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "自动备份" });

    await userEvent.setup().click(toggle);

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(toggle.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("SwitchField: 说明", () => {
  it("给了说明时挂在开关的无障碍描述上", () => {
    render(
      <SwitchField
        label="自动备份"
        description="到点自动发送."
        isChecked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("switch", { name: "自动备份" });
    const descriptionId = toggle.getAttribute("aria-describedby");
    expect(descriptionId).not.toBeNull();
    expect(document.getElementById(descriptionId ?? "")?.textContent).toBe(
      "到点自动发送.",
    );
  });

  it("没给说明时不挂无障碍描述", () => {
    render(
      <SwitchField
        label="自动备份"
        isChecked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("switch", { name: "自动备份" });
    expect(toggle.getAttribute("aria-describedby")).toBeNull();
  });
});
