import { describe, expect, it } from "vitest";

import {
  readHexCustomProperty,
  resolveWindowBackground,
} from "./window-background";

describe("readHexCustomProperty", () => {
  it("读出自定义属性的十六进制取值", () => {
    const css = ":root { --base-surface-light: #ffffff; }";

    expect(readHexCustomProperty(css, "--base-surface-light")).toBe("#ffffff");
  });

  it("属性不存在时抛出明确的错误", () => {
    expect(() =>
      readHexCustomProperty(":root {}", "--base-surface-dark"),
    ).toThrow("--base-surface-dark");
  });

  it("取值不是十六进制字面量时抛出错误", () => {
    const css = ":root { --base-surface-dark: var(--other); }";

    expect(() => readHexCustomProperty(css, "--base-surface-dark")).toThrow(
      Error,
    );
  });
});

describe("resolveWindowBackground", () => {
  it("从 token 原始值层读出明暗两套窗口背景色", () => {
    expect(resolveWindowBackground("light")).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect(resolveWindowBackground("dark")).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect(resolveWindowBackground("light")).not.toBe(
      resolveWindowBackground("dark"),
    );
  });
});
