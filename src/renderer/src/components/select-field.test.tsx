import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectField } from "./select-field";

/**
 * 测试用的选项.
 */
const ITEMS = [
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
] as const;

describe("SelectField: 选择", () => {
  it("标签是下拉的无障碍名称, 显示当前选项的文字", () => {
    render(
      <SelectField
        label="备份间隔"
        items={ITEMS}
        value="weekly"
        onChange={vi.fn()}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "备份间隔" });
    expect(combobox.textContent).toContain("每周");
  });

  it("选了别的选项时以新的取值调用回调", async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="备份间隔"
        items={ITEMS}
        value="daily"
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "备份间隔" }));
    await user.click(await screen.findByRole("option", { name: "每周" }));

    expect(onChange).toHaveBeenCalledWith("weekly");
  });

  it("不可改时下拉不可点", () => {
    render(
      <SelectField
        label="备份间隔"
        items={ITEMS}
        value="daily"
        isDisabled
        onChange={vi.fn()}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "备份间隔" });
    expect(combobox.hasAttribute("disabled")).toBe(true);
  });
});
