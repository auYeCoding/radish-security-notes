import { describe, expect, it } from "vitest";

import { FRAMELESS_WINDOW_OPTIONS } from "./frameless-window-options";

describe("FRAMELESS_WINDOW_OPTIONS", () => {
  it("不使用系统边框与标题栏", () => {
    expect(FRAMELESS_WINDOW_OPTIONS).toEqual({ frame: false });
  });
});
