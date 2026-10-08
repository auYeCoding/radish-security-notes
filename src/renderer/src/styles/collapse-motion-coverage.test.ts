import { describe, expect, it } from "vitest";

import { listRendererSources } from "@renderer/testing/list-renderer-sources";

/**
 * 折叠动效常量模块的导入路径.
 */
const COLLAPSE_MOTION_IMPORT = "@renderer/components/ui/collapse-motion";

/**
 * 直接引用折叠动效常量的文件, 与它们必须引用的常量.
 */
const COLLAPSE_CONSTANT_COVERAGE: readonly (readonly [
  string,
  readonly string[],
])[] = [
  [
    "app/sidebar.tsx",
    [
      "COLLAPSE_EXTENT_TRANSITION",
      "TOGGLE_ROW_SPACER_CLASSES",
      "TOGGLE_ROW_ALIGNMENT_CLASSES",
    ],
  ],
  [
    "components/collapsible-box.tsx",
    [
      "COLLAPSE_BOX_BASE_CLASSES",
      "COLLAPSE_BOX_AXIS_CLASSES",
      "COLLAPSE_FADE_TRANSITION",
      "COLLAPSE_FADE_CLASSES",
    ],
  ],
  [
    "components/collapsible-text.tsx",
    [
      "COLLAPSIBLE_TEXT_BASE_CLASSES",
      "COLLAPSE_FADE_TRANSITION",
      "COLLAPSE_FADE_CLASSES",
    ],
  ],
  ["components/sidebar-nav-item-text.tsx", ["COLLAPSIBLE_TEXT_STATE_CLASSES"]],
  [
    "components/sidebar-button-icon.tsx",
    [
      "COLLAPSE_SPACE_TRANSITION",
      "COLLAPSE_FADE_TRANSITION",
      "COLLAPSE_FADE_CLASSES",
    ],
  ],
];

/**
 * 经共用组件获得折叠过渡的文件, 与它们必须使用的组件和组件的导入路径.
 */
const COLLAPSE_COMPONENT_COVERAGE: readonly (readonly [
  string,
  string,
  string,
])[] = [
  [
    "components/sidebar-nav-item.tsx",
    "SidebarNavItemActions",
    "./sidebar-nav-item-actions",
  ],
  [
    "components/sidebar-nav-item-actions.tsx",
    "CollapsibleBox",
    "@renderer/components/collapsible-box",
  ],
  [
    "components/pane-heading.tsx",
    "CollapsibleBox",
    "@renderer/components/collapsible-box",
  ],
  [
    "components/empty-state.tsx",
    "CollapsibleBox",
    "@renderer/components/collapsible-box",
  ],
  [
    "components/sidebar-nav-item-text.tsx",
    "CollapsibleText",
    "@renderer/components/collapsible-text",
  ],
  [
    "components/sidebar-footer-button.tsx",
    "CollapsibleText",
    "@renderer/components/collapsible-text",
  ],
  [
    "components/sidebar-footer-button.tsx",
    "SidebarButtonIcon",
    "@renderer/components/sidebar-button-icon",
  ],
  [
    "features/settings-trigger/settings-trigger.tsx",
    "SidebarFooterButton",
    "@renderer/components/sidebar-footer-button",
  ],
];

/**
 * 在主题样式里登记过的过渡属性名, 常量模块里的 `transition-<名称>` 类名依赖它们生成.
 */
const REGISTERED_TRANSITION_PROPERTIES: readonly string[] = [
  "extent",
  "flex-space",
];

/**
 * 常量名或组件名在文件里至少出现的次数: 一次导入加一次使用.
 */
const MIN_OCCURRENCES = 2;

/**
 * 统计片段在文本里出现的次数.
 * @param text 被检查的文本.
 * @param fragment 要统计的片段.
 * @returns 出现的次数.
 */
function countOccurrences(text: string, fragment: string): number {
  return text.split(fragment).length - 1;
}

/**
 * 按相对路径取扫描范围内的源文件文本.
 * @param path 相对渲染端根目录的路径.
 * @returns 源文件文本, 不在扫描范围内时是 undefined.
 */
function readSource(path: string): string | undefined {
  return listRendererSources().find((source) => source.relativePath === path)
    ?.text;
}

describe("折叠动效的覆盖", () => {
  it.each(COLLAPSE_CONSTANT_COVERAGE)(
    "%s 在源码扫描范围内, 并经折叠动效常量引用过渡",
    (path, constantNames) => {
      const text = readSource(path);

      expect(text).toBeDefined();
      expect(text).toContain(COLLAPSE_MOTION_IMPORT);
      for (const constantName of constantNames) {
        expect(
          countOccurrences(text ?? "", constantName),
        ).toBeGreaterThanOrEqual(MIN_OCCURRENCES);
      }
    },
  );

  it.each(COLLAPSE_COMPONENT_COVERAGE)(
    "%s 经 %s 获得折叠过渡",
    (path, componentName, importPath) => {
      const text = readSource(path);

      expect(text).toBeDefined();
      expect(text).toContain(importPath);
      expect(
        countOccurrences(text ?? "", componentName),
      ).toBeGreaterThanOrEqual(MIN_OCCURRENCES);
    },
  );

  it("侧栏折叠相关组件不再用屏幕外隐藏瞬间收起文字", () => {
    const paths = [
      ...COLLAPSE_CONSTANT_COVERAGE.map(([path]) => path),
      ...COLLAPSE_COMPONENT_COVERAGE.map(([path]) => path),
    ];
    const violations = paths.filter((path) =>
      (readSource(path) ?? "").includes("sr-only"),
    );

    expect(violations).toEqual([]);
  });
});

describe("折叠动效依赖的样式登记", () => {
  const sources = listRendererSources();

  it.each(REGISTERED_TRANSITION_PROPERTIES)(
    "过渡属性名 %s 在主题样式里登记, 并被常量模块使用",
    (name) => {
      const theme = sources.find(
        (source) => source.relativePath === "styles/theme.css",
      );
      const constants = sources.find(
        (source) => source.relativePath === "components/ui/collapse-motion.ts",
      );

      expect(theme?.text).toContain(`--transition-property-${name}:`);
      expect(constants?.text).toContain(`transition-${name}`);
    },
  );

  it("根元素允许宽高在自动尺寸与零之间过渡", () => {
    const globals = sources.find(
      (source) => source.relativePath === "styles/globals.css",
    );

    expect(globals?.text).toContain("interpolate-size: allow-keywords");
  });
});
