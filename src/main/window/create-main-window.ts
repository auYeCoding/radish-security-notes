import { join } from "path";

import { is } from "@electron-toolkit/utils";
import { BrowserWindow, shell } from "electron";

/**
 * 创建主窗口的选项.
 */
export interface MainWindowOptions {
  /**
   * 窗口图标的文件路径.
   */
  readonly icon: string;
  /**
   * 窗口标题.
   */
  readonly title: string;
  /**
   * 窗口背景色, 与当前明暗主题的背景 token 一致, 避免首帧白闪.
   */
  readonly backgroundColor: string;
}

/**
 * 主窗口内容区的最小宽度, 与 Tailwind 的 md 断点一致, 保证恢复词网格固定的 4 列放得下.
 */
export const MAIN_WINDOW_MIN_WIDTH = 768;

/**
 * 主窗口的初始宽度, 按内容区计.
 */
const MAIN_WINDOW_WIDTH = 1100;

/**
 * 主窗口的初始高度, 按内容区计.
 */
const MAIN_WINDOW_HEIGHT = 720;

/**
 * 创建主窗口, 渲染完成后再显示. 开发环境加载 electron-vite 提供的渲染进程地址,
 * 生产环境加载打包后的本地 index.html.
 * @param options 窗口选项.
 * @returns 新建的主窗口.
 */
export function createMainWindow(options: MainWindowOptions): BrowserWindow {
  const mainWindow = new BrowserWindow({
    useContentSize: true,
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: MAIN_WINDOW_MIN_WIDTH,
    show: false,
    autoHideMenuBar: true,
    icon: options.icon,
    title: options.title,
    backgroundColor: options.backgroundColor,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });
  mainWindow.on("page-title-updated", (event) => event.preventDefault());
  mainWindow.on("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  loadRenderer(mainWindow);
  return mainWindow;
}

/**
 * 让窗口加载渲染进程页面.
 * @param mainWindow 要加载页面的窗口.
 */
function loadRenderer(mainWindow: BrowserWindow): void {
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    return;
  }
  mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}
