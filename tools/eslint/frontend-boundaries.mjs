import boundaries from "eslint-plugin-boundaries";

import {
  FRONTEND_SCRIPT_FILES,
  frontendManifest,
} from "./frontend-manifest.mjs";

/**
 * 前端根下直接放置的入口文件, 例如 `main.tsx`, 归入 `entry` 文件分类.
 * @type {readonly string[]}
 */
const ENTRY_FILE_PATTERNS = [
  `${frontendManifest.frontendRoot}/*.ts`,
  `${frontendManifest.frontendRoot}/*.tsx`,
];

/**
 * 入口文件的文件分类名.
 */
const ENTRY_CATEGORY = "entry";

/**
 * 入口文件允许依赖的元素类型.
 * @type {readonly string[]}
 */
const ENTRY_ALLOWED_DEPENDENCIES = ["app", "styles", "shared"];

/**
 * 测试文件匹配模式, 归入 `test` 文件分类.
 * @type {readonly string[]}
 */
const TEST_FILE_PATTERNS = ["**/*.test.ts", "**/*.test.tsx"];

/**
 * 测试文件的文件分类名.
 */
const TEST_CATEGORY = "test";

/**
 * 测试文件额外允许依赖的元素类型: 测试支撑代码只允许测试文件引用.
 * @type {readonly string[]}
 */
const TEST_ALLOWED_DEPENDENCIES = ["testing"];

/**
 * 每种元素允许依赖的元素类型. 同一个元素内部的互相引用不受限制, 所以同一个
 * feature 内的文件可以互相引用, 不同 feature 之间不在任何一项里, 因此被禁止.
 * 没有出现的类型, 例如 `main` 与 `preload`, 任何元素都不允许依赖.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
const ALLOWED_DEPENDENCIES = {
  app: ["feature", "components", "lib", "stores", "i18n", "theme", "shared"],
  feature: ["components", "lib", "stores", "i18n", "theme", "shared"],
  components: ["lib", "shared"],
  lib: ["shared"],
  stores: ["lib", "shared"],
  i18n: ["shared"],
  theme: ["shared"],
  testing: ["stores", "i18n", "shared"],
};

/**
 * 依赖被禁止时给出的提示.
 */
const DEPENDENCY_MESSAGE =
  "依赖方向必须是 入口 -> app -> features -> components, lib, stores, i18n, theme -> shared; feature 之间不能互相引用, 前端代码不能引用 src/main 与 src/preload.";

/**
 * 根据 manifest 的分区生成 boundaries 元素定义. 分区 `features` 下每个子目录是
 * 一个 feature 元素, 其余分区各自是一个元素, `offLimits` 的目录也定义成元素,
 * 这样引用它们会被默认的禁止策略拦下.
 * @returns {object[]} boundaries 的元素定义列表.
 */
function createElements() {
  const { zones, offLimits } = frontendManifest;
  const zoneElements = Object.entries(zones)
    .filter(([name]) => name !== "features")
    .map(([name, path]) => ({ type: name, pattern: path }));
  const offLimitElements = offLimits.map((path) => ({
    type: path.split("/").at(-1),
    pattern: path,
  }));
  return [
    {
      type: "feature",
      pattern: `${zones.features}/*`,
      capture: ["featureName"],
    },
    ...zoneElements,
    ...offLimitElements,
  ];
}

/**
 * 根据允许依赖表生成 boundaries 的依赖策略, 含入口文件的一条策略.
 * @returns {object[]} 依赖策略列表.
 */
function createPolicies() {
  const elementPolicies = Object.entries(ALLOWED_DEPENDENCIES).map(
    ([type, targets]) => ({
      from: { element: { type } },
      allow: { to: { element: { type: [...targets] } } },
    }),
  );
  const entryPolicy = {
    from: { file: { categories: ENTRY_CATEGORY } },
    allow: { to: { element: { type: [...ENTRY_ALLOWED_DEPENDENCIES] } } },
  };
  const testPolicy = {
    from: { file: { categories: TEST_CATEGORY } },
    allow: { to: { element: { type: [...TEST_ALLOWED_DEPENDENCIES] } } },
  };
  return [...elementPolicies, entryPolicy, testPolicy];
}

/**
 * 依赖边界的 ESLint 配置: 前端根与共享层的文件必须遵守单向依赖, feature 相互隔离,
 * 且不得引用 `offLimits` 目录.
 * @type {import("eslint").Linter.Config[]}
 */
export const frontendBoundariesConfigs = [
  {
    files: [
      ...FRONTEND_SCRIPT_FILES,
      `${frontendManifest.zones.shared}/**/*.ts`,
    ],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": createElements(),
      "boundaries/files": [
        { pattern: [...ENTRY_FILE_PATTERNS], category: ENTRY_CATEGORY },
        { pattern: [...TEST_FILE_PATTERNS], category: TEST_CATEGORY },
      ],
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "tsconfig.web.json" },
      },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message: DEPENDENCY_MESSAGE,
          policies: createPolicies(),
        },
      ],
    },
  },
];
