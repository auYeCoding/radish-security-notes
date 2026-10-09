import { describe, expect, it } from "vitest";

import { listRendererSources } from "@renderer/testing/list-renderer-sources";

/**
 * 组件 token 文件的相对路径.
 */
const COMPONENT_TOKENS_PATH = "styles/tokens.components.css";

/**
 * 类名里用括号引用的侧栏尺寸变量, 例如 `ms-(--sidebar-row-icon-inset)`.
 */
const SIDEBAR_VARIABLE_REFERENCE = /\(--(sidebar-[\w-]+)\)/g;

/**
 * 折叠态图标位置, 分隔线位置与切换按钮位置依赖的四个组件 token.
 */
const GEOMETRY_TOKENS: readonly string[] = [
  "sidebar-row-icon-inset",
  "sidebar-footer-icon-inset",
  "sidebar-separator-offset",
  "sidebar-toggle-offset",
];

describe("侧栏折叠态的几何 token", () => {
  const sources = listRendererSources();
  const scriptSources = sources.filter((source) =>
    /\.tsx?$/.test(source.relativePath),
  );
  const tokenSheet =
    sources.find((source) => source.relativePath === COMPONENT_TOKENS_PATH)
      ?.text ?? "";

  it.each(GEOMETRY_TOKENS)("组件 token 文件里定义了 --%s", (name) => {
    expect(tokenSheet).toContain(`--${name}:`);
  });

  it("每个由类名引用的 --sidebar-* 变量都在组件 token 文件里定义", () => {
    const referenced = scriptSources.flatMap((source) =>
      Array.from(
        source.text.matchAll(SIDEBAR_VARIABLE_REFERENCE),
        (match) => match[1],
      ),
    );
    const undefinedNames = referenced.filter(
      (name) => !tokenSheet.includes(`--${name}:`),
    );

    expect(referenced.length).toBeGreaterThan(0);
    expect(Array.from(new Set(undefinedNames))).toEqual([]);
  });

  it("四个几何 token 都被类名引用, 不留无人使用的定义", () => {
    const referenced = new Set(
      scriptSources.flatMap((source) =>
        Array.from(
          source.text.matchAll(SIDEBAR_VARIABLE_REFERENCE),
          (match) => match[1],
        ),
      ),
    );

    GEOMETRY_TOKENS.forEach((name) => expect(referenced.has(name)).toBe(true));
  });

  it("折叠态偏移用间距单位计算, 不写像素字面量", () => {
    const geometryBlock = tokenSheet.slice(
      tokenSheet.indexOf("--sidebar-row-icon-inset"),
    );

    expect(geometryBlock).not.toMatch(/\d\s*px/);
  });
});
