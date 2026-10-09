import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * 点侧栏底部的设置按钮打开设置对话框, 取其中的 "标签" 分区. 工作区必须已渲染.
 * @returns 标签分区元素.
 */
export async function openTagSection(): Promise<HTMLElement> {
  await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));
  const dialog = await screen.findByRole("dialog", { name: "设置" });
  return within(dialog).getByRole("region", { name: "标签" });
}

/**
 * 取标签分区里每个标签的名称, 按列表里从上到下的顺序.
 * @param section 标签分区元素.
 * @returns 标签名称.
 */
export function listedTagNames(section: HTMLElement): string[] {
  return within(section)
    .queryAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}
