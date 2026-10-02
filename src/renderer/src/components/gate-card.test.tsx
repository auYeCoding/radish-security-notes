import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GateCard } from "./gate-card";

/**
 * 渲染卡片并取出卡片元素.
 * @param props 要传给卡片的属性.
 * @returns 卡片元素.
 */
function renderCard(
  props: Partial<React.ComponentProps<typeof GateCard>> = {},
): HTMLElement {
  render(
    <GateCard title="标题" {...props}>
      <p>正文</p>
    </GateCard>,
  );
  return screen
    .getByRole("heading", { name: "标题" })
    .closest("[data-slot=card]") as HTMLElement;
}

describe("GateCard 宽度", () => {
  it("默认是窄卡片", () => {
    const card = renderCard();

    expect(card.classList.contains("max-w-sm")).toBe(true);
    expect(card.classList.contains("max-w-3xl")).toBe(false);
  });

  it("wide 是宽卡片", () => {
    const card = renderCard({ size: "wide" });

    expect(card.classList.contains("max-w-3xl")).toBe(true);
    expect(card.classList.contains("max-w-sm")).toBe(false);
  });
});

describe("GateCard 打印", () => {
  it("默认打印时不隐藏, 与恢复功能加入之前一致", () => {
    expect(renderCard().className).not.toContain("print:");
  });

  it("isHiddenOnPrint 为真时打印隐藏", () => {
    expect(
      renderCard({ isHiddenOnPrint: true }).classList.contains("print:hidden"),
    ).toBe(true);
  });
});
