import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TotpCountdown } from "./totp-countdown";

/**
 * 渲染倒计时.
 * @param remainingSeconds 剩余秒数.
 * @param isEnding 是否临近换码.
 * @param periodSeconds 周期秒数, 默认 30.
 */
function renderCountdown(
  remainingSeconds: number,
  isEnding: boolean,
  periodSeconds = 30,
): void {
  render(
    <TotpCountdown
      remainingSeconds={remainingSeconds}
      periodSeconds={periodSeconds}
      isEnding={isEnding}
      remainingText={`还剩 ${remainingSeconds} 秒`}
      endingText="即将换码"
      progressLabel="距离换码的剩余时间"
    />,
  );
}

describe("TotpCountdown", () => {
  it("显示剩余时间文字与带名称的进度条, 进度是剩余时间占周期的比例", () => {
    renderCountdown(15, false);

    expect(screen.getByText("还剩 15 秒")).toBeDefined();
    const bar = screen.getByRole("progressbar", {
      name: "距离换码的剩余时间",
    });
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
  });

  it("没有临近换码时不出现提示文字, 剩余时间不加粗", () => {
    renderCountdown(25, false);

    expect(screen.queryByText("即将换码")).toBeNull();
    expect(screen.getByText("还剩 25 秒").className).not.toContain(
      "font-semibold",
    );
  });

  it("临近换码时出现提示文字, 剩余时间加粗", () => {
    renderCountdown(8, true);

    expect(screen.getByText("即将换码")).toBeDefined();
    expect(screen.getByText("还剩 8 秒").className).toContain("font-semibold");
  });

  it("进度按周期换算, 并限制在 0 到 100 之间", () => {
    renderCountdown(0, true, 60);

    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "0",
    );
  });
});
