import { electronApp, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, ipcMain } from "electron";

import icon from "../../../resources/icon.png?asset";
import { registerPreferencesIpc } from "../ipc/preferences-ipc";
import { resolveWindowBackground } from "../theme/window-background";
import { createMainWindow } from "../window/create-main-window";
import { applyWindowBackground, applyWindowTitle } from "../window/window-sync";
import {
  createPreferencesRuntime,
  type PreferencesRuntime,
} from "./preferences-runtime";

/**
 * 应用的用户模型标识, Windows 用它归并任务栏与通知.
 */
const APP_USER_MODEL_ID = "com.electron";

/**
 * 让全部窗口的标题与背景色跟随语言和主题的变化.
 * @param runtime 偏好运行时对象.
 */
function keepWindowsInSync(runtime: PreferencesRuntime): void {
  runtime.service.onLanguageChanged(() =>
    applyWindowTitle(
      BrowserWindow.getAllWindows(),
      runtime.i18n.t("app.title"),
    ),
  );
  runtime.themeController.onResolvedThemeChanged((resolvedTheme) =>
    applyWindowBackground(
      BrowserWindow.getAllWindows(),
      resolveWindowBackground(resolvedTheme),
    ),
  );
}

/**
 * 按当前主题与语言创建主窗口.
 * @param runtime 偏好运行时对象.
 */
function openMainWindow(runtime: PreferencesRuntime): void {
  createMainWindow({
    icon,
    title: runtime.i18n.t("app.title"),
    backgroundColor: resolveWindowBackground(
      runtime.themeController.getResolvedTheme(),
    ),
  });
}

/**
 * 启动应用: 先应用主题并建好 i18n, 再注册 IPC, 最后创建主窗口. 在 app ready 之后调用.
 * @returns 启动完成后兑现.
 */
export async function startApplication(): Promise<void> {
  electronApp.setAppUserModelId(APP_USER_MODEL_ID);
  app.on("browser-window-created", (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  const runtime = await createPreferencesRuntime();
  registerPreferencesIpc(ipcMain, runtime.service);
  keepWindowsInSync(runtime);
  openMainWindow(runtime);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow(runtime);
    }
  });
}
