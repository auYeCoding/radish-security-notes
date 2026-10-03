import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TAG_COLOR_KEYS, type TagColorKey } from "@shared/tags/tag-colors";

import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";

import { TagColorPicker } from "./tag-color-picker";

/**
 * 渲染调色板.
 * @param value 当前选中的颜色键.
 * @param onChange 选中新颜色时的回调.
 */
async function renderPicker(
  value: TagColorKey,
  onChange: (color: TagColorKey) => void,
): Promise<void> {
  const environment = await createEntryTestEnvironment();
  render(
    <TagColorPicker
      value={value}
      onChange={onChange}
      labelledBy="color-label"
    />,
    { wrapper: environment.Providers },
  );
}

describe("TagColorPicker", () => {
  it("列出全部 8 种颜色, 只有当前颜色是按下状态", async () => {
    await renderPicker("blue", () => undefined);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(TAG_COLOR_KEYS.length);
    expect(
      buttons
        .filter((button) => button.getAttribute("aria-pressed") === "true")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["蓝色"]);
  });

  it("点另一种颜色时回调收到它的颜色键", async () => {
    const onChange = vi.fn();
    await renderPicker("slate", onChange);

    await userEvent.setup().click(screen.getByRole("button", { name: "粉色" }));

    expect(onChange).toHaveBeenCalledWith("pink");
  });

  it("再点已选中的颜色不触发回调, 不会变成没有颜色", async () => {
    const onChange = vi.fn();
    await renderPicker("slate", onChange);

    await userEvent.setup().click(screen.getByRole("button", { name: "灰色" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
