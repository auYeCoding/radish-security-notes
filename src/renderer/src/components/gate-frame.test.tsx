import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GateFrame } from "./gate-frame";
import { DEFAULT_GATE_FRAME_LAYOUT } from "./gate-frame-layout";

/**
 * 渲染出的外框里被检查的两个元素.
 */
interface FrameElements {
  /**
   * 外框的主区域.
   */
  readonly main: HTMLElement;
  /**
   * 右上角控件的容器.
   */
  readonly corner: HTMLElement;
}

/**
 * 渲染外框并取出它的主区域与右上角控件的容器.
 * @param props 要传给外框的版式属性.
 * @returns 主区域元素与右上角容器元素.
 */
function renderFrame(
  props: Partial<React.ComponentProps<typeof GateFrame>> = {},
): FrameElements {
  render(
    <GateFrame corner={<span>右上角</span>} {...props}>
      <p>内容</p>
    </GateFrame>,
  );
  return {
    main: screen.getByRole("main"),
    corner: screen.getByText("右上角").parentElement as HTMLElement,
  };
}

describe("GateFrame 上下内边距", () => {
  it("默认是 p-6, 与恢复功能加入之前一致", () => {
    const { main } = renderFrame();

    expect(main.classList.contains("p-6")).toBe(true);
    expect(main.classList.contains("py-16")).toBe(false);
  });

  it("宽松档是 px-6 py-16, 不再带 p-6", () => {
    const { main } = renderFrame({ spacing: "roomy" });

    expect(main.classList.contains("px-6")).toBe(true);
    expect(main.classList.contains("py-16")).toBe(true);
    expect(main.classList.contains("p-6")).toBe(false);
  });
});

describe("GateFrame 默认版式", () => {
  it("不传版式属性与传默认版式渲染出相同的类名", () => {
    const withoutLayout = renderFrame();
    const withoutLayoutClasses = [
      withoutLayout.main.className,
      withoutLayout.corner.className,
    ];
    cleanup();

    const withDefaultLayout = renderFrame({ ...DEFAULT_GATE_FRAME_LAYOUT });

    expect([
      withDefaultLayout.main.className,
      withDefaultLayout.corner.className,
    ]).toEqual(withoutLayoutClasses);
  });
});

describe("GateFrame 打印", () => {
  it("默认不带任何打印类名, 打印时与屏幕一样", () => {
    const { main, corner } = renderFrame();

    expect(main.className).not.toContain("print:");
    expect(corner.className).not.toContain("print:");
  });

  it("带打印套件时外框取消最小高度与内边距, 右上角控件隐藏", () => {
    const { main, corner } = renderFrame({ isPrintKit: true });

    expect(main.classList.contains("print:block")).toBe(true);
    expect(main.classList.contains("print:min-h-0")).toBe(true);
    expect(main.classList.contains("print:p-0")).toBe(true);
    expect(corner.classList.contains("print:hidden")).toBe(true);
  });

  it("内边距档位与打印套件互不影响", () => {
    const { main } = renderFrame({ spacing: "roomy", isPrintKit: true });

    expect(main.classList.contains("py-16")).toBe(true);
    expect(main.classList.contains("print:p-0")).toBe(true);
  });
});
