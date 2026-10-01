import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

/**
 * 主进程与 preload 的构建目标, 对应 Electron 44.5.1 内置的 Node 24.21.
 */
const NODE_BUILD_TARGET = "node24.21";

/**
 * 渲染进程的构建目标, 对应 Electron 44.5.1 内置的 Chromium 152.
 */
const CHROME_BUILD_TARGET = "chrome152";

/**
 * electron-vite 构建配置, 分别定义主进程, preload 与渲染进程的构建选项.
 */
export default defineConfig({
  main: {
    build: {
      target: NODE_BUILD_TARGET,
    },
  },
  preload: {
    build: {
      target: NODE_BUILD_TARGET,
    },
  },
  renderer: {
    build: {
      target: CHROME_BUILD_TARGET,
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    plugins: [react()],
  },
});
