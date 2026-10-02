import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImagePickButton } from "./image-pick-button";

/**
 * 取隐藏的文件输入框.
 * @returns 文件输入框元素.
 */
function getFileInput(): HTMLInputElement {
  return screen.getByLabelText("选择图片", {
    selector: "input",
  }) as HTMLInputElement;
}

describe("ImagePickButton", () => {
  it("有一个名称为按钮文字的按钮, 隐藏的输入框只接受图片", () => {
    render(<ImagePickButton label="选择图片" onPick={() => undefined} />);

    expect(screen.getByRole("button", { name: "选择图片" })).toBeDefined();
    expect(getFileInput().type).toBe("file");
    expect(getFileInput().accept).toBe("image/*");
  });

  it("选中图片后回调所选文件, 并清空输入框以便再次选择同一张", async () => {
    const onPick = vi.fn();
    render(<ImagePickButton label="选择图片" onPick={onPick} />);
    const image = new File(["png"], "qr.png", { type: "image/png" });

    await userEvent.setup().upload(getFileInput(), image);

    expect(onPick).toHaveBeenCalledWith(image);
    expect(getFileInput().value).toBe("");
  });

  it("点击按钮会点击隐藏的输入框", async () => {
    render(<ImagePickButton label="选择图片" onPick={() => undefined} />);
    const onInputClick = vi.fn();
    getFileInput().addEventListener("click", onInputClick);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "选择图片" }));

    expect(onInputClick).toHaveBeenCalledTimes(1);
  });

  it("禁用时按钮不可点击", () => {
    render(
      <ImagePickButton label="选择图片" onPick={() => undefined} isDisabled />,
    );

    expect(
      (screen.getByRole("button", { name: "选择图片" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
