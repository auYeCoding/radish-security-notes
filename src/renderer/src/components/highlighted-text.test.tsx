import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HighlightedText } from "./highlighted-text";

describe("HighlightedText", () => {
  it("没有区间时只输出原文, 不包任何元素", () => {
    const { container } = render(
      <span>
        <HighlightedText text="GitHub" ranges={[]} />
      </span>,
    );

    expect(container.innerHTML).toBe("<span>GitHub</span>");
  });

  it("命中处包进 mark 元素, 其余原样, 连起来等于原文", () => {
    const { container } = render(
      <span>
        <HighlightedText
          text="GitHub Work"
          ranges={[
            { start: 0, end: 3 },
            { start: 7, end: 11 },
          ]}
        />
      </span>,
    );

    const marks = Array.from(container.querySelectorAll("mark"));
    expect(marks.map((mark) => mark.textContent)).toEqual(["Git", "Work"]);
    expect(container.textContent).toBe("GitHub Work");
  });

  it("命中处的文字颜色继承, 只加浅底色", () => {
    const { container } = render(
      <HighlightedText text="abc" ranges={[{ start: 0, end: 1 }]} />,
    );

    const mark = container.querySelector("mark");
    expect(mark?.className).toContain("text-inherit");
    expect(mark?.className).toContain("bg-brand/20");
  });
});
