import { describe, expect, it } from "vitest";

import { createMainWindowHolder } from "./main-window-holder";

describe("createMainWindowHolder", () => {
  it("没有登记时读取到 undefined", () => {
    expect(createMainWindowHolder<object>().get()).toBeUndefined();
  });

  it("登记后读取到同一个窗口", () => {
    const holder = createMainWindowHolder<object>();
    const window = {};

    holder.set(window);

    expect(holder.get()).toBe(window);
  });

  it("再次登记会取代之前的窗口", () => {
    const holder = createMainWindowHolder<object>();
    const replacement = {};
    holder.set({});

    holder.set(replacement);

    expect(holder.get()).toBe(replacement);
  });
});
