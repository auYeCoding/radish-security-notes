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

describe("SelectField: 标签行右端的内容", () => {
  it("没给时标签不额外包一层, 标签的下一个兄弟就是下拉", () => {
    render(
      <SelectField
        label="备份间隔"
        items={ITEMS}
        value="daily"
        onChange={vi.fn()}
      />,
    );

    const label = screen.getByText("备份间隔");
    expect(label.nextElementSibling).toBe(
      screen.getByRole("combobox", { name: "备份间隔" }),
    );
  });

  it("给了时与标签在同一行, 排在标签之后并靠右对齐, 下拉仍以标签命名", () => {
    render(
      <SelectField
        label="备份间隔"
        items={ITEMS}
        value="daily"
        labelAction={<span>右端内容</span>}
        onChange={vi.fn()}
      />,
    );

    const label = screen.getByText("备份间隔");
    const action = screen.getByText("右端内容");
    const row = label.parentElement;
    expect(row).toBe(action.parentElement);
    expect(row?.classList.contains("justify-between")).toBe(true);
    expect(label.nextElementSibling).toBe(action);
    expect(screen.getByRole("combobox", { name: "备份间隔" })).toBeDefined();
  });
});
