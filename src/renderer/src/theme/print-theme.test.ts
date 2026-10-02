import { describe, expect, it } from "vitest";

import { DARK_CLASS_NAME } from "./dark-class";
import { forceLightThemeWhilePrinting } from "./print-theme";

describe("forceLightThemeWhilePrinting", () => {
  it("深色外观下打印前去掉深色类名, 打印后还原", () => {
    const root = document.createElement("html");
    root.classList.add(DARK_CLASS_NAME);
    forceLightThemeWhilePrinting(root, window);

    window.dispatchEvent(new Event("beforeprint"));
    const duringPrint = root.classList.contains(DARK_CLASS_NAME);
    window.dispatchEvent(new Event("afterprint"));

    expect(duringPrint).toBe(false);
    expect(root.classList.contains(DARK_CLASS_NAME)).toBe(true);
  });

  it("浅色外观下打印前后都没有深色类名", () => {
    const root = document.createElement("html");
    forceLightThemeWhilePrinting(root, window);

    window.dispatchEvent(new Event("beforeprint"));
    window.dispatchEvent(new Event("afterprint"));

    expect(root.classList.contains(DARK_CLASS_NAME)).toBe(false);
  });

  it("取消监听后不再改动类名", () => {
    const root = document.createElement("html");
    root.classList.add(DARK_CLASS_NAME);
    const stop = forceLightThemeWhilePrinting(root, window);

    stop();
    window.dispatchEvent(new Event("beforeprint"));

    expect(root.classList.contains(DARK_CLASS_NAME)).toBe(true);
  });
});
