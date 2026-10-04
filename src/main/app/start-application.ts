import { electronApp, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, ipcMain } from "electron";

import icon from "../../../resources/icon.png?asset";
import { registerAttachmentIpc } from "../ipc/attachment-ipc";
import { registerBatchIpc } from "../ipc/batch-ipc";
import { registerEntryIpc } from "../ipc/entry-ipc";
import { registerFolderIpc } from "../ipc/folder-ipc";
import { registerLinkIpc } from "../ipc/link-ipc";
import type { ExternalLinkOpener } from "../links/external-link-opener";
import { registerPreferencesIpc } from "../ipc/preferences-ipc";
import { registerRecoveryIpc } from "../ipc/recovery-ipc";
import { registerTagIpc } from "../ipc/tag-ipc";
import { registerTotpIpc } from "../ipc/totp-ipc";
import { registerVaultIpc } from "../ipc/vault-ipc";
import { resolveWindowBackground } from "../theme/window-background";
import { createMainWindow } from "../window/create-main-window";
import { applyWindowBackground, applyWindowTitle } from "../window/window-sync";
import {
  createPreferencesRuntime,
  type PreferencesRuntime,
} from "./preferences-runtime";
import { createAttachmentRuntime } from "./attachment-runtime";
import { createBatchService } from "./batch-runtime";
import { createEntryRuntime } from "./entry-runtime";
import { createFolderService } from "./folder-runtime";
import { createLinkRuntime } from "./link-runtime";
import { createRecoveryRuntime } from "./recovery-runtime";
import { createTagService } from "./tag-runtime";
import { createVaultRuntime } from "./vault-runtime";

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
 * @param openExternalLink 外部链接打开器.
 */
function openMainWindow(
  runtime: PreferencesRuntime,
  openExternalLink: ExternalLinkOpener,
): void {
  createMainWindow({
    icon,
    title: runtime.i18n.t("app.title"),
    backgroundColor: resolveWindowBackground(
      runtime.themeController.getResolvedTheme(),
    ),
    openExternalLink,
  });
}

/**
 * 启动应用: 先应用主题并建好 i18n, 判定保险库状态, 再注册 IPC, 最后创建主窗口.
 * 在 app ready 之后调用.
 * @returns 启动完成后兑现.
 */
export async function startApplication(): Promise<void> {
  electronApp.setAppUserModelId(APP_USER_MODEL_ID);
  app.on("browser-window-created", (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  const runtime = await createPreferencesRuntime();
  const vault = await createVaultRuntime();
  registerPreferencesIpc(ipcMain, runtime.service);
  registerVaultIpc(ipcMain, vault.service);
  const recovery = createRecoveryRuntime(runtime.i18n);
  registerRecoveryIpc(ipcMain, vault.service, recovery.textFileSaver);
  const entries = createEntryRuntime(vault.service);
  registerEntryIpc(ipcMain, entries.service);
  registerFolderIpc(ipcMain, createFolderService(vault.service));
  registerTagIpc(ipcMain, createTagService(vault.service));
  registerBatchIpc(ipcMain, createBatchService(vault.service));
  registerTotpIpc(ipcMain, entries.totpService, entries.decodeQrImage);
  const attachments = createAttachmentRuntime(vault.service, runtime.i18n);
  registerAttachmentIpc(ipcMain, attachments);
  const openExternalLink = createLinkRuntime();
  registerLinkIpc(ipcMain, openExternalLink);
  app.on("will-quit", () => {
    attachments.discardTemporaryCopies();
    vault.service.close();
  });
  keepWindowsInSync(runtime);
  openMainWindow(runtime, openExternalLink);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow(runtime, openExternalLink);
    }
  });
}
