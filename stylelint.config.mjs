import { frontendManifest } from "./tools/eslint/frontend-manifest.mjs";

/**
 * 不纳入检查的目录. `.navigator/` 与 `.claude/` 由插件管理, 不属于项目代码.
 */
const IGNORED_PATHS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/out/**",
  ".navigator/**",
  ".claude/**",
];

/**
 * 创建颜色的 CSS 函数. 这些函数只能出现在原始值层, 其它层必须用 `var()` 引用 token.
 */
const RAW_COLOR_FUNCTIONS = [
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
];

/**
 * 原始尺寸字面量的匹配正则, 例如 `13px`, `0.5rem`.
 */
const RAW_LENGTH_PATTERN = "/\\d(px|rem|em)\\b/";

/**
 * 只允许原始值出现的第 1 层文件.
 */
const PRIMITIVES_FILE = frontendManifest.tokenLayers.primitivesFile;

/**
 * 禁止原始值的规则. 原始颜色与原始尺寸只能出现在第 1 层文件, 其它文件必须引用 token.
 */
const RAW_VALUE_RULES = {
  "color-no-hex": true,
  "color-named": "never",
  "function-disallowed-list": RAW_COLOR_FUNCTIONS,
  "declaration-property-value-disallowed-list": {
    "/.*/": [RAW_LENGTH_PATTERN],
  },
};

/**
 * 在原始值层文件里关闭上面全部规则.
 */
const RAW_VALUE_RULES_OFF = Object.fromEntries(
  Object.keys(RAW_VALUE_RULES).map((rule) => [rule, null]),
);

/**
 * Stylelint 配置: 前端 CSS 里原始颜色与尺寸字面量只能出现在第 1 层 token 文件.
 * 不启用 at-rule 未知检查, 避免误报 Tailwind 4 的 `@theme` 与 `@custom-variant`.
 * @type {import("stylelint").Config}
 */
export default {
  ignoreFiles: IGNORED_PATHS,
  rules: RAW_VALUE_RULES,
  overrides: [
    {
      files: [PRIMITIVES_FILE],
      rules: RAW_VALUE_RULES_OFF,
    },
  ],
};
