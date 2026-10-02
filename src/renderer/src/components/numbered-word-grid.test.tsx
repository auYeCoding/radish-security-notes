import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NumberedWordGrid } from "./numbered-word-grid";

/**
 * 测试用的词个数, 与恢复词的 24 个一致.
 */
const WORD_COUNT = 24;

/**
 * 渲染一个格子里只写序号的网格.
 * @returns 网格的列表元素.
 */
function renderGrid(): HTMLElement {
  render(
    <NumberedWordGrid
      label="恢复词"
      count={WORD_COUNT}
      renderCell={(position) => <span>{`cell-${position}`}</span>}
    />,
  );
  return screen.getByRole("list", { name: "恢复词" });
}

describe("NumberedWordGrid 内容", () => {
  it("按序号从 1 到 count 渲染, 每个格子拿到自己的序号", () => {
    const items = within(renderGrid()).getAllByRole("listitem");

    expect(items).toHaveLength(WORD_COUNT);
    expect(items.map((item) => item.textContent)).toEqual(
      Array.from(
        { length: WORD_COUNT },
        (_, index) => `${index + 1}.cell-${index + 1}`,
      ),
    );
  });
});

describe("NumberedWordGrid 列数", () => {
  it("屏幕固定 4 列, 即 6 行 4 列按行读", () => {
    const list = renderGrid();

    expect(list.classList.contains("grid-cols-4")).toBe(true);
    expect(WORD_COUNT / 4).toBe(6);
  });

  it("不随窗口宽度或打印媒体改变列数", () => {
    const columnClasses = Array.from(renderGrid().classList).filter((name) =>
      name.includes("grid-cols"),
    );

    expect(columnClasses).toEqual(["grid-cols-4"]);
  });
});
