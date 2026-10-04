import {
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from "electron";

/**
 * 弹出 Electron 的系统保存对话框, 有焦点窗口时作为它的模态子窗口.
 * @param options 对话框选项.
 * @returns 用户选定的路径, 取消时为 undefined.
 */
export async function showSaveDialogOnFocusedWindow(
  options: SaveDialogOptions,
): Promise<string | undefined> {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result =
    focusedWindow === null
      ? await dialog.showSaveDialog(options)
      : await dialog.showSaveDialog(focusedWindow, options);
  return result.canceled ? undefined : result.filePath;
}

/**
 * 弹出 Electron 的系统选择文件对话框, 有焦点窗口时作为它的模态子窗口.
 * @param options 对话框选项.
 * @returns 用户选定的路径, 取消时为 undefined.
 */
export async function showOpenDialogOnFocusedWindow(
  options: OpenDialogOptions,
): Promise<readonly string[] | undefined> {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result =
    focusedWindow === null
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(focusedWindow, options);
  return result.canceled ? undefined : result.filePaths;
}
