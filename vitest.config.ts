import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * main 项目的测试文件, 覆盖主进程, preload 与共享模块, 在 Node 环境中运行.
 */
const MAIN_TEST_FILES = [
  "src/main/**/*.test.ts",
  "src/preload/**/*.test.ts",
  "src/shared/**/*.test.ts",
];

/**
 * renderer 项目的测试文件, 在 jsdom 环境中运行.
 */
const RENDERER_TEST_FILES = ["src/renderer/src/**/*.test.{ts,tsx}"];

/**
 * renderer 项目的启动文件: 每个测试结束后卸载已渲染的组件.
 */
const RENDERER_SETUP_FILES = ["src/renderer/src/testing/setup.ts"];

/**
 * 覆盖率统计的源文件.
 */
const COVERAGE_INCLUDE = ["src/**/*.{ts,tsx}"];

/**
 * 覆盖率统计排除的文件: 测试文件与类型声明文件.
 */
const COVERAGE_EXCLUDE = ["**/*.test.{ts,tsx}", "**/*.d.ts"];

/**
 * 以 `?raw` 方式读取的样式文件. Vitest 默认把样式文件替换为空串, 主进程要读取
 * token 原始值层的文本, 所以对这类导入保留原文.
 */
const RAW_CSS_FILES = [/\.css\?raw$/];

/**
 * 三个进程共享的别名, 指向 `src/shared`.
 */
const SHARED_ALIAS = { "@shared": resolve("src/shared") };

/**
 * 单个测试的超时, 单位毫秒. Vitest 默认的 5 秒在整套测试满载并行时出现过超时 (0053 与基线运行里
 * 都遇到过), 取默认值的三倍, 只放宽被机器负载拖慢的情形, 真正卡住的测试仍会在十几秒内报错.
 */
export const TEST_TIMEOUT_MILLISECONDS = 15000;

/**
 * 持续集成环境里单个测试的超时, 单位毫秒. GitHub 的 Windows 运行机比开发机慢得多, 首次运行时
 * 最慢的测试用了 46 秒, 有 4 个测试超过本机的 15 秒上限; 取本机超时的八倍, 留出一倍以上余量.
 */
export const CONTINUOUS_INTEGRATION_TEST_TIMEOUT_MILLISECONDS =
  TEST_TIMEOUT_MILLISECONDS * 8;

/**
 * 本次运行实际生效的测试超时: 持续集成环境 (GitHub Actions 等会设置环境变量 `CI`) 用放宽的值,
 * 其余情形用本机的值.
 */
export const EFFECTIVE_TEST_TIMEOUT_MILLISECONDS =
  process.env.CI === undefined || process.env.CI === ""
    ? TEST_TIMEOUT_MILLISECONDS
    : CONTINUOUS_INTEGRATION_TEST_TIMEOUT_MILLISECONDS;

/**
 * Vitest 配置, 分 main 与 renderer 两个项目, 两个项目共用同一个测试超时, 覆盖率用 v8.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: SHARED_ALIAS,
        },
        test: {
          name: "main",
          environment: "node",
          testTimeout: EFFECTIVE_TEST_TIMEOUT_MILLISECONDS,
          include: MAIN_TEST_FILES,
          css: { include: RAW_CSS_FILES },
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@renderer": resolve("src/renderer/src"),
            ...SHARED_ALIAS,
          },
        },
        test: {
          name: "renderer",
          environment: "jsdom",
          testTimeout: EFFECTIVE_TEST_TIMEOUT_MILLISECONDS,
          include: RENDERER_TEST_FILES,
          setupFiles: RENDERER_SETUP_FILES,
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
