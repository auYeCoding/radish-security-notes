import { describe, expect, it, vi } from "vitest";

import { attemptSilently } from "./attempt-silently";

describe("attemptSilently", () => {
  it("动作没有抛错时执行它并返回 true", () => {
    const action = vi.fn();

    expect(attemptSilently(action)).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("动作抛错时不向外抛, 返回 false", () => {
    const action = vi.fn(() => {
      throw new Error("关闭失败");
    });

    expect(attemptSilently(action)).toBe(false);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
