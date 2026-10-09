import { describe, expect, it } from "vitest";

import { listRendererSources } from "@renderer/testing/list-renderer-sources";

/**
 * 动效常量模块的导入路径, 应用自有组件从这里取过渡与淡入类名.
 */
const STATE_MOTION_IMPORT = "@renderer/components/ui/state-motion";

/**
 * 通用控件目录, 动效类名常量定义在这里, 只有这里可以直接写进入动画的类名.
 */
const UI_DIRECTORY_PREFIX = "components/ui/";

/**
 * 直接写出的进入或退出动画类名, 应用自有组件必须经常量引用.
 */
const HAND_WRITTEN_ANIMATION = /\banimate-(in|out)\b|\bfade-(in|out)-0\b/;

/**
 * 应用自有组件里自带状态类的文件, 与它们必须引用的动效常量.
 */
const APP_COMPONENT_COVERAGE: readonly (readonly [
  string,
  readonly string[],
])[] = [
  ["components/sidebar-nav-item.tsx", ["FAST_STATE_TRANSITION"]],
  ["features/entry-list-pane/entry-list-item.tsx", ["FAST_STATE_TRANSITION"]],
  ["features/entry-attachments/attachment-row.tsx", ["FAST_STATE_TRANSITION"]],
  [
    "features/entry-attachments/attachment-drop-zone.tsx",
    ["FAST_STATE_TRANSITION", "FADE_IN_MOTION"],
  ],
  [
    "components/totp-countdown.tsx",
    ["FAST_STATE_TRANSITION", "FADE_IN_MOTION"],
  ],
  ["components/totp-code-button.tsx", ["FADE_IN_MOTION"]],
  ["components/copy-button.tsx", ["FADE_IN_MOTION"]],
  ["features/entry-batch-bar/batch-bar-actions.tsx", ["FADE_IN_MOTION"]],
  [
    "features/entry-detail-pane/entry-detail-view.tsx",
    ["CONTENT_ENTER_MOTION"],
  ],
  ["features/entry-detail-pane/entry-detail-skeleton.tsx", ["FADE_IN_MOTION"]],
];

/**
 * 常量名在文件里至少出现的次数: 一次导入加一次使用.
 */
const MIN_CONSTANT_OCCURRENCES = 2;

/**
 * 统计片段在文本里出现的次数.
 * @param text 被检查的文本.
 * @param fragment 要统计的片段.
 * @returns 出现的次数.
 */
function countOccurrences(text: string, fragment: string): number {
  return text.split(fragment).length - 1;
}

describe("应用自有组件的动效覆盖", () => {
  const sources = listRendererSources();

  it.each(APP_COMPONENT_COVERAGE)(
    "%s 在源码扫描范围内, 并经常量引用过渡或淡入",
    (path, constantNames) => {
      const file = sources.find((source) => source.relativePath === path);

      expect(file).toBeDefined();
      expect(file?.text).toContain(STATE_MOTION_IMPORT);
      for (const constantName of constantNames) {
        expect(
          countOccurrences(file?.text ?? "", constantName),
        ).toBeGreaterThanOrEqual(MIN_CONSTANT_OCCURRENCES);
      }
    },
  );

  it("应用自有组件里没有手写的进入或退出动画类名, 也没有 transition-all", () => {
    const violations = sources
      .filter((source) => !source.relativePath.startsWith(UI_DIRECTORY_PREFIX))
      .filter(
        (source) =>
          HAND_WRITTEN_ANIMATION.test(source.text) ||
          source.text.includes("transition-all"),
      )
      .map((source) => source.relativePath);

    expect(violations).toEqual([]);
  });
});
