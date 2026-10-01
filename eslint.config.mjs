import { defineConfig } from "eslint/config";
import tseslint from "@electron-toolkit/eslint-config-ts";
import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import eslintPluginJsdoc from "eslint-plugin-jsdoc";
import { documentationRules } from "./tools/eslint/documentation-rules.mjs";
import { frontendConstraintConfigs } from "./tools/eslint/frontend-constraints.mjs";
import { noCommentsInFunctionBody } from "./tools/eslint/no-comments-in-function-body.mjs";

/**
 * 单个函数允许的最大行数, 不计空行与注释.
 */
const MAX_LINES_PER_FUNCTION = 50;

/**
 * 单个函数允许的最大圈复杂度.
 */
const MAX_COMPLEXITY = 10;

/**
 * 单个文件允许的最大行数, 不计空行与注释.
 */
const MAX_LINES_PER_FILE = 300;

/**
 * 不纳入检查的目录. `.navigator/` 与 `.claude/` 由插件管理, 不属于项目代码.
 */
const IGNORED_PATHS = [
  "**/node_modules",
  "**/dist",
  "**/out",
  ".navigator/**",
  ".claude/**",
];

/**
 * 纯 JavaScript 文件. 它们无法标注返回类型, 所以不要求显式返回类型.
 */
const JAVASCRIPT_FILES = ["**/*.{js,mjs,cjs}"];

/**
 * 项目自写规则的插件, 规则以 `local/` 为前缀引用.
 */
const LOCAL_PLUGIN = {
  rules: {
    "no-comments-in-function-body": noCommentsInFunctionBody,
  },
};

/**
 * ESLint 扁平配置, 组合 TypeScript, React, React Hooks 与 Prettier 规则,
 * 限制函数长度, 圈复杂度与文件长度, 并要求声明有文档注释且函数体内无注释.
 */
export default defineConfig(
  { ignores: IGNORED_PATHS },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat["jsx-runtime"],
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": eslintPluginReactRefresh,
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
    },
  },
  {
    rules: {
      "max-lines-per-function": [
        "error",
        {
          max: MAX_LINES_PER_FUNCTION,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      complexity: ["error", { max: MAX_COMPLEXITY }],
      "max-lines": [
        "error",
        { max: MAX_LINES_PER_FILE, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { jsdoc: eslintPluginJsdoc },
    rules: documentationRules,
  },
  {
    files: JAVASCRIPT_FILES,
    rules: { "@typescript-eslint/explicit-function-return-type": "off" },
  },
  {
    plugins: { local: LOCAL_PLUGIN },
    rules: { "local/no-comments-in-function-body": "error" },
  },
  ...frontendConstraintConfigs,
  eslintConfigPrettier,
);
