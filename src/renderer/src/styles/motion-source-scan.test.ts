import { describe, expect, it } from "vitest";

import { findHardcodedMotion } from "@renderer/testing/find-hardcoded-motion";
import { listRendererSources } from "@renderer/testing/list-renderer-sources";

describe("渲染端源码的动效取值", () => {
  const sources = listRendererSources();
  const paths = sources.map((file) => file.relativePath);

  it("扫描范围含 components/ui 的组件与全局样式, 不含测试与原始值层", () => {
    expect(paths).toContain("components/ui/dialog.tsx");
    expect(paths).toContain("components/ui/tooltip.tsx");
    expect(paths).toContain("styles/globals.css");
    expect(paths).toContain("styles/tokens.semantic.css");
    expect(paths).not.toContain("styles/tokens.primitives.css");
    expect(paths.filter((path) => path.includes(".test."))).toEqual([]);
  });

  it("没有写死毫秒的过渡与动画时长, 也没有自定义曲线", () => {
    const violations = sources.flatMap((file) =>
      findHardcodedMotion(file.text).map(
        (match) => `${file.relativePath}: ${match}`,
      ),
    );

    expect(violations).toEqual([]);
  });
});
