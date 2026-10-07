import { describe, expect, it } from "vitest";

import { createFakeMainWindow } from "../testing/fake-main-window";
import {
  closeWindow,
  isWindowMaximized,
  minimizeWindow,
  toggleWindowMaximize,
} from "./window-controls";

describe("窗口控制", () => {
  it("最小化只调用窗口的最小化", () => {
    const window = createFakeMainWindow();

    minimizeWindow(window);

    expect(window.minimize).toHaveBeenCalledOnce();
    expect(window.close).not.toHaveBeenCalled();
  });

  it("未最大化时切换会最大化, 不还原", () => {
    const window = createFakeMainWindow(false);

    toggleWindowMaximize(window);

    expect(window.maximize).toHaveBeenCalledOnce();
    expect(window.unmaximize).not.toHaveBeenCalled();
  });

  it("已最大化时切换会还原, 不最大化", () => {
    const window = createFakeMainWindow(true);

    toggleWindowMaximize(window);

    expect(window.unmaximize).toHaveBeenCalledOnce();
    expect(window.maximize).not.toHaveBeenCalled();
  });

  it("关闭只调用窗口的关闭", () => {
    const window = createFakeMainWindow();

    closeWindow(window);

    expect(window.close).toHaveBeenCalledOnce();
    expect(window.minimize).not.toHaveBeenCalled();
  });

  it("查询最大化状态返回窗口当前的状态", () => {
    expect(isWindowMaximized(createFakeMainWindow(true))).toBe(true);
    expect(isWindowMaximized(createFakeMainWindow(false))).toBe(false);
  });
});
