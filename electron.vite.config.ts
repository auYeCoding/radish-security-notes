import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

/**
 * 主进程与 preload 的构建目标, 对应 Electron 44.5.1 内置的 Node 24.21.
 */
const NODE_BUILD_TARGET = "node24.21";

/**
 * 渲染进程的构建目标, 对应 Electron 44.5.1 内置的 Chromium 152.
 */
const CHROME_BUILD_TARGET = "chrome152";

/**
 * 渲染进程开发服务器监听的地址. 显式用 IPv4 回环地址, 避免 `localhost` 在
 * 服务器与 Electron 之间解析成不同协议族而出现 ERR_CONNECTION_REFUSED.
 */
const DEV_SERVER_HOST = "127.0.0.1";

/**
 * 三个进程共享的别名, 指向 `src/shared`.
 */
const SHARED_ALIAS = { "@shared": resolve("src/shared") };

/**
 * 要打进主进程产物而不是外置的依赖. 主进程产物是 CommonJS: electron-store 与
 * pseudo-localization 只提供 ESM 入口, 运行时无法 require; i18next-icu 的默认导出
 * 在外置 require 时拿到的是带 default 属性的命名空间对象, 打包后才按预期解析.
 */
const BUNDLED_MAIN_DEPENDENCIES = [
  "electron-store",
  "pseudo-localization",
  "i18next-icu",
];

/**
 * electron-vite 构建配置, 分别定义主进程, preload 与渲染进程的构建选项.
 */
export default defineConfig({
  main: {
    build: {
      target: NODE_BUILD_TARGET,
      externalizeDeps: { exclude: BUNDLED_MAIN_DEPENDENCIES },
    },
    resolve: {
      alias: SHARED_ALIAS,
    },
  },
  preload: {
    build: {
      target: NODE_BUILD_TARGET,
    },
    resolve: {
      alias: SHARED_ALIAS,
    },
  },
  renderer: {
    build: {
      target: CHROME_BUILD_TARGET,
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        ...SHARED_ALIAS,
      },
    },
    server: {
      host: DEV_SERVER_HOST,
    },
    plugins: [react(), tailwindcss()],
  },
});
