import { describe, expect, it } from "vitest";

import { intentOfRowClick } from "./entry-row-click";

/**
 * 没有按住任何修饰键的点击.
 */
const PLAIN = { ctrlKey: false, metaKey: false, shiftKey: false };

describe("intentOfRowClick", () => {
  it("没按修饰键是选中查看详情", () => {
    expect(intentOfRowClick(PLAIN)).toBe("select");
  });

  it("按住 Ctrl 或 Meta 是切换勾选", () => {
    expect(intentOfRowClick({ ...PLAIN, ctrlKey: true })).toBe("toggle");
    expect(intentOfRowClick({ ...PLAIN, metaKey: true })).toBe("toggle");
  });

  it("按住 Shift 是连选区间, 同时按住 Ctrl 时按切换勾选处理", () => {
    expect(intentOfRowClick({ ...PLAIN, shiftKey: true })).toBe("range");
    expect(
      intentOfRowClick({ ctrlKey: true, metaKey: false, shiftKey: true }),
    ).toBe("toggle");
  });
});
