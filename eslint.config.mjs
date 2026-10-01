import { defineConfig } from "eslint/config";
import tseslint from "@electron-toolkit/eslint-config-ts";
import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";

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
 * ESLint 扁平配置, 组合 TypeScript, React, React Hooks 与 Prettier 规则,
 * 并限制函数长度, 圈复杂度与文件长度.
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
  eslintConfigPrettier,
);
