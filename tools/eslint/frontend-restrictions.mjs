import {
  FRONTEND_SCRIPT_FILES,
  UI_LIBRARY_FILES,
  frontendManifest,
} from "./frontend-manifest.mjs";

/**
 * 禁止在组件与页面里直接使用的原生交互元素, 必须改用 UI 库或项目已封装的组件.
 * @type {readonly string[]}
 */
const NATIVE_INTERACTIVE_ELEMENTS = [
  "button",
  "input",
  "select",
  "textarea",
  "a",
];

/**
 * 类名里出现任意值的匹配正则: `bg-[#fff]`, `p-[13px]` 这类绕过 token 的写法.
 * 字符串不能直接写成字面量选择器, 所以以字符串形式给出.
 */
const ARBITRARY_VALUE_PATTERN = "-\\[";

/**
 * 样式写死原始值时的提示.
 */
const ARBITRARY_VALUE_MESSAGE =
  "类名不能用任意值 (如 bg-[#fff], p-[13px]), 样式必须取自设计 token.";

/**
 * 命中类名字符串的选择器: JSX 的 className 属性里的字符串, 以及 cn, cva, clsx
 * 调用里的字符串.
 * @type {readonly string[]}
 */
const CLASS_NAME_STRING_SELECTORS = [
  `JSXAttribute[name.name='className'] Literal[value=/${ARBITRARY_VALUE_PATTERN}/]`,
  `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${ARBITRARY_VALUE_PATTERN}/]`,
  `CallExpression[callee.name=/^(cn|cva|clsx)$/]:not(JSXAttribute[name.name='className'] CallExpression) Literal[value=/${ARBITRARY_VALUE_PATTERN}/]`,
];

/**
 * 原始值层 token 文件的匹配模式, 脚本不得直接引用.
 */
const PRIMITIVES_FILE_PATTERN = `**/${frontendManifest.tokenLayers.primitivesFile.split("/").at(-1)}`;

/**
 * 前端的限制规则: 禁裸原生交互元素, 禁行内 style, 禁类名任意值, 禁直接引用原始值层.
 * UI 库封装层不受前三项约束.
 * @type {import("eslint").Linter.Config[]}
 */
export const frontendRestrictionConfigs = [
  {
    files: FRONTEND_SCRIPT_FILES,
    ignores: UI_LIBRARY_FILES,
    rules: {
      "react/forbid-elements": [
        "error",
        {
          forbid: NATIVE_INTERACTIVE_ELEMENTS.map((element) => ({
            element,
            message: `禁止直接使用原生 <${element}>, 请使用 components 下封装的组件.`,
          })),
        },
      ],
      "react/forbid-dom-props": [
        "error",
        {
          forbid: [
            {
              propName: "style",
              message: "禁止行内 style, 样式必须取自设计 token.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...CLASS_NAME_STRING_SELECTORS.map((selector) => ({
          selector,
          message: ARBITRARY_VALUE_MESSAGE,
        })),
      ],
    },
  },
  {
    files: FRONTEND_SCRIPT_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [PRIMITIVES_FILE_PATTERN],
              message: "不能直接引用原始值层 token, 只能引用语义层与组件层.",
            },
          ],
        },
      ],
    },
  },
];
