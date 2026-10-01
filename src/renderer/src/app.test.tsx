import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import App from "@renderer/App";

describe("App", () => {
  it("在 jsdom 中能同步渲染且不抛出错误", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    expect(() => {
      flushSync(() => {
        root.render(<App />);
      });
    }).not.toThrow();
    root.unmount();
  });
});
