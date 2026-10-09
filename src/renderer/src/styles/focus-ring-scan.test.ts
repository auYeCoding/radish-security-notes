import { describe, expect, it } from "vitest";

import { findThickFocusRings } from "@renderer/testing/find-thick-focus-rings";
import { listRendererSources } from "@renderer/testing/list-renderer-sources";

/**
 * 必须在扫描范围内的控件组件文件: 文本框类与非文本控件.
 */
const CONTROL_SOURCE_PATHS: readonly string[] = [
  "components/ui/input.tsx",
  "components/ui/textarea.tsx",
  "components/ui/input-group.tsx",
  "components/ui/combobox-chips.tsx",
  "components/ui/select.tsx",
  "components/ui/button-variants.ts",
  "components/ui/toggle-variants.ts",
  "components/ui/badge-variants.ts",
  "components/ui/checkbox.tsx",
  "components/ui/switch.tsx",
  "components/ui/radio-group.tsx",
  "components/ui/scroll-area.tsx",
  "components/ui/field.tsx",
  "components/ui/focus-outline.ts",
];

describe("渲染端源码的聚焦与错误描边", () => {
  const sources = listRendererSources();
  const paths = sources.map((file) => file.relativePath);

  it("扫描范围含全部控件组件文件", () => {
    expect(paths).toEqual(expect.arrayContaining([...CONTROL_SOURCE_PATHS]));
  });

  it("没有 3px 外圈, 也没有挂在聚焦或错误状态上的外圈", () => {
    const violations = sources.flatMap((file) =>
      findThickFocusRings(file.text).map(
        (match) => `${file.relativePath}: ${match}`,
      ),
    );

    expect(violations).toEqual([]);
  });
});
