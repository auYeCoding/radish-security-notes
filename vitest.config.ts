import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * main 项目的测试文件, 覆盖主进程与 preload, 在 Node 环境中运行.
 */
const MAIN_TEST_FILES = ["src/main/**/*.test.ts", "src/preload/**/*.test.ts"];

/**
 * renderer 项目的测试文件, 在 jsdom 环境中运行.
 */
const RENDERER_TEST_FILES = ["src/renderer/src/**/*.test.{ts,tsx}"];

/**
 * 覆盖率统计的源文件.
 */
const COVERAGE_INCLUDE = ["src/**/*.{ts,tsx}"];

/**
 * 覆盖率统计排除的文件: 测试文件与类型声明文件.
 */
const COVERAGE_EXCLUDE = ["**/*.test.{ts,tsx}", "**/*.d.ts"];

/**
 * Vitest 配置, 分 main 与 renderer 两个项目, 覆盖率用 v8.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "main",
          environment: "node",
          include: MAIN_TEST_FILES,
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@renderer": resolve("src/renderer/src"),
          },
        },
        test: {
          name: "renderer",
          environment: "jsdom",
          include: RENDERER_TEST_FILES,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: COVERAGE_INCLUDE,
      exclude: COVERAGE_EXCLUDE,
    },
  },
});
