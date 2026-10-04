import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAIN_WINDOW_HEIGHT,
  MAIN_WINDOW_MIN_WIDTH,
  MAIN_WINDOW_WIDTH,
  createMainWindow,
} from "./create-main-window";

/**
 * 替身 electron 模块里的窗口构造函数间谍, 记录收到的窗口选项, 返回只有创建流程用到的方法的假窗口.
 */
const electronMocks = vi.hoisted(() => {
  const webContentsOn = vi.fn();
  const setWindowOpenHandler = vi.fn();
  return {
    webContentsOn,
    setWindowOpenHandler,
    createWindow: vi.fn(function () {
      return {
        webContents: {
          setWindowOpenHandler,
          on: webContentsOn,
          getURL: vi.fn(() => ""),
        },
        on: vi.fn(),
        loadURL: vi.fn(),
        loadFile: vi.fn(),
      };
    }),
  };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMocks.createWindow,
  shell: { openExternal: vi.fn() },
}));

vi.mock("@electron-toolkit/utils", () => ({ is: { dev: false } }));

/**
 * 创建主窗口所需的最小选项.
 */
const WINDOW_OPTIONS = {
  icon: "icon.png",
  title: "Radish",
  backgroundColor: "#ffffff",
  openExternalLink: () => Promise.resolve(true),
};

afterEach(() => {
  electronMocks.createWindow.mockClear();
  electronMocks.webContentsOn.mockClear();
  electronMocks.setWindowOpenHandler.mockClear();
});

describe("createMainWindow 导航防护", () => {
  it("监听页面导航并设置新窗口处理函数, 窗口不会导航离开应用", () => {
    createMainWindow(WINDOW_OPTIONS);

    expect(electronMocks.webContentsOn).toHaveBeenCalledWith(
      "will-navigate",
      expect.any(Function),
    );
    expect(electronMocks.setWindowOpenHandler).toHaveBeenCalledTimes(1);
  });
});

describe("createMainWindow 窗口尺寸", () => {
  it("内容区最小宽度是 768 像素, 与恢复词网格固定 4 列配套", () => {
    createMainWindow(WINDOW_OPTIONS);

    expect(MAIN_WINDOW_MIN_WIDTH).toBe(768);
    expect(electronMocks.createWindow).toHaveBeenCalledWith(
      expect.objectContaining({ minWidth: MAIN_WINDOW_MIN_WIDTH }),
    );
  });

  it("宽高与最小宽度都按内容区计, 不含窗口边框", () => {
    createMainWindow(WINDOW_OPTIONS);

    expect(electronMocks.createWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        useContentSize: true,
        width: MAIN_WINDOW_WIDTH,
        height: MAIN_WINDOW_HEIGHT,
      }),
    );
  });
});
