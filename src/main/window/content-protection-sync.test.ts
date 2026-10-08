import { describe, expect, it, vi } from "vitest";

import { applyWindowContentProtection } from "./content-protection-sync";

describe("applyWindowContentProtection", () => {
  it("把开关同步到每个窗口", () => {
    const first = { setContentProtection: vi.fn() };
    const second = { setContentProtection: vi.fn() };

    applyWindowContentProtection([first, second], true);

    expect(first.setContentProtection).toHaveBeenCalledExactlyOnceWith(true);
    expect(second.setContentProtection).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("关闭时同样同步", () => {
    const window = { setContentProtection: vi.fn() };

    applyWindowContentProtection([window], false);

    expect(window.setContentProtection).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("没有窗口时什么也不做", () => {
    expect(() => applyWindowContentProtection([], true)).not.toThrow();
  });
});
