import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  showOpenDialogOnFocusedWindow,
  showSaveDialogOnFocusedWindow,
} from "./electron-dialogs";

/**
 * 替身 electron 模块里的间谍方法: 取焦点窗口, 弹保存对话框, 弹选择文件对话框.
 */
const electronMocks = vi.hoisted(() => ({
  getFocusedWindow: vi.fn(),
  showSaveDialog: vi.fn(),
  showOpenDialog: vi.fn(),
}));

vi.mock("electron", () => ({
  BrowserWindow: { getFocusedWindow: electronMocks.getFocusedWindow },
  dialog: {
    showSaveDialog: electronMocks.showSaveDialog,
    showOpenDialog: electronMocks.showOpenDialog,
  },
}));

beforeEach(() => {
  electronMocks.getFocusedWindow.mockReturnValue(null);
  electronMocks.showSaveDialog.mockResolvedValue({
    canceled: false,
    filePath: "D:\\keep\\a.txt",
  });
  electronMocks.showOpenDialog.mockResolvedValue({
    canceled: false,
    filePaths: ["D:\\a.txt", "D:\\b.txt"],
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("showSaveDialogOnFocusedWindow", () => {
  it("没有焦点窗口时直接弹出, 返回用户选的路径", async () => {
    const options = { title: "另存为" };

    const chosen = await showSaveDialogOnFocusedWindow(options);

    expect(electronMocks.showSaveDialog).toHaveBeenCalledWith(options);
    expect(chosen).toBe("D:\\keep\\a.txt");
  });

  it("有焦点窗口时作为它的模态子窗口, 用户取消时返回 undefined", async () => {
    const focusedWindow = { id: 1 };
    electronMocks.getFocusedWindow.mockReturnValue(focusedWindow);
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: true });
    const options = { title: "另存为" };

    const chosen = await showSaveDialogOnFocusedWindow(options);

    expect(electronMocks.showSaveDialog).toHaveBeenCalledWith(
      focusedWindow,
      options,
    );
    expect(chosen).toBeUndefined();
  });
});

describe("showOpenDialogOnFocusedWindow", () => {
  it("没有焦点窗口时直接弹出, 返回用户选的全部路径", async () => {
    const options = { title: "选择", properties: ["openFile" as const] };

    const chosen = await showOpenDialogOnFocusedWindow(options);

    expect(electronMocks.showOpenDialog).toHaveBeenCalledWith(options);
    expect(chosen).toEqual(["D:\\a.txt", "D:\\b.txt"]);
  });

  it("有焦点窗口时作为它的模态子窗口, 用户取消时返回 undefined", async () => {
    const focusedWindow = { id: 1 };
    electronMocks.getFocusedWindow.mockReturnValue(focusedWindow);
    electronMocks.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    const options = { title: "选择" };

    const chosen = await showOpenDialogOnFocusedWindow(options);

    expect(electronMocks.showOpenDialog).toHaveBeenCalledWith(
      focusedWindow,
      options,
    );
    expect(chosen).toBeUndefined();
  });
});
