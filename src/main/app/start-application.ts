import { electronApp, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, ipcMain } from "electron";
import type { i18n } from "i18next";

import icon from "../../../resources/icon.png?asset";
import { registerAttachmentIpc } from "../ipc/attachment-ipc";
import { registerBatchIpc } from "../ipc/batch-ipc";
import { registerCustomEntryTypeIpc } from "../ipc/custom-entry-type-ipc";
import { registerEmailBackupIpc } from "../ipc/email-backup-ipc";
import { registerEntryIpc } from "../ipc/entry-ipc";
import { registerExportIpc } from "../ipc/export-ipc";
import { registerFolderIpc } from "../ipc/folder-ipc";
import { registerImportIpc } from "../ipc/import-ipc";
import { registerLinkIpc } from "../ipc/link-ipc";
import { guardIpcMainByMainWindow } from "../ipc/main-window-guarded-ipc";
import { registerMasterPasswordIpc } from "../ipc/master-password-ipc";
import type { ExportService } from "../export/export-service";
import type { ImportService } from "../import/import-service";
import type { ExternalLinkOpener } from "../links/external-link-opener";
import type { RestoreService } from "../restore/restore-service";
import {
  registerPreferencesIpc,
  type IpcMainPort,
} from "../ipc/preferences-ipc";
import { registerRecoveryIpc } from "../ipc/recovery-ipc";
import { registerRecoveryKeyIpc } from "../ipc/recovery-key-ipc";
import { registerRestoreIpc } from "../ipc/restore-ipc";
import { registerTagIpc } from "../ipc/tag-ipc";
import { registerTotpIpc } from "../ipc/totp-ipc";
import { registerVaultIpc } from "../ipc/vault-ipc";
import { registerWindowControlsIpc } from "../ipc/window-controls-ipc";
import { resolveWindowBackground } from "../theme/window-background";
import { createMainWindow } from "../window/create-main-window";
import {
  createMainWindowHolder,
  type MainWindowHolder,
} from "../window/main-window-holder";
import { watchMaximizedState } from "../window/maximized-state-notifier";
import { watchSecondInstance } from "../window/second-instance-activation";
import { applyWindowBackground, applyWindowTitle } from "../window/window-sync";
import {
  createPreferencesRuntime,
  type PreferencesRuntime,
} from "./preferences-runtime";
import { createAttachmentRuntime } from "./attachment-runtime";
import { createBatchService } from "./batch-runtime";
import { createEmailBackupRuntime } from "./email-backup-runtime";
import { createEntryRuntime } from "./entry-runtime";
import { createExportRuntime } from "./export-runtime";
import { createCustomEntryTypeService } from "./entry-type-runtime";
import { createFolderService } from "./folder-runtime";
import { createImportRuntime } from "./import-runtime";
import { createLinkRuntime } from "./link-runtime";
import { createRecoveryRuntime } from "./recovery-runtime";
import { registerLockParticipants } from "./register-lock-participants";
import { createRestoreRuntime } from "./restore-runtime";
import { createTagService } from "./tag-runtime";
import { createVaultRuntime, type VaultRuntime } from "./vault-runtime";

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
 * 按当前主题与语言创建主窗口, 登记到主窗口持有者, 并让它的最大化状态推送给页面.
 * @param runtime 偏好运行时对象.
 * @param openExternalLink 外部链接打开器.
 * @param mainWindowHolder 主窗口持有者.
 */
function openMainWindow(
  runtime: PreferencesRuntime,
  openExternalLink: ExternalLinkOpener,
  mainWindowHolder: MainWindowHolder<BrowserWindow>,
): void {
  const mainWindow = createMainWindow({
    icon,
    title: runtime.i18n.t("app.title"),
    backgroundColor: resolveWindowBackground(
      runtime.themeController.getResolvedTheme(),
    ),
    openExternalLink,
  });
  mainWindowHolder.set(mainWindow);
  watchMaximizedState(mainWindow);
}

/**
 * 启动主窗口: 让第二个实例启动时唤起已有的主窗口, 注册窗口控制的 IPC, 让全部窗口的标题与背景色
 * 跟随语言和主题, 创建主窗口, 并在没有窗口时被重新激活的情形下再创建一个.
 * @param runtime 偏好运行时对象.
 * @param openExternalLink 外部链接打开器.
 * @param mainWindowHolder 主窗口持有者.
 * @param guardedIpcMain 带来源校验的主进程 IPC 接口.
 */
function launchMainWindow(
  runtime: PreferencesRuntime,
  openExternalLink: ExternalLinkOpener,
  mainWindowHolder: MainWindowHolder<BrowserWindow>,
  guardedIpcMain: IpcMainPort,
): void {
  watchSecondInstance(app, mainWindowHolder);
  registerWindowControlsIpc(guardedIpcMain, mainWindowHolder);
  keepWindowsInSync(runtime);
  openMainWindow(runtime, openExternalLink, mainWindowHolder);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow(runtime, openExternalLink, mainWindowHolder);
    }
  });
}

/**
 * 数据进出的三个服务.
 */
interface DataTransferServices {
  /**
   * 导入服务.
   */
  readonly importService: ImportService;
  /**
   * 导出服务.
   */
  readonly exportService: ExportService;
  /**
   * 恢复服务.
   */
  readonly restoreService: RestoreService;
}

/**
 * 注册数据进出的 IPC: 从其他管理器导入, 导出, 从备份恢复. 它们都读写已解锁的加密数据库, 文件的
 * 选择, 读取与写出都在主进程里完成.
 * @param guardedIpcMain 带来源校验的主进程 IPC 接口.
 * @param vault 保险库运行时对象.
 * @param translator 主进程的 i18next 实例.
 * @returns 三个服务, 供锁定登记使用.
 */
function registerDataTransferIpc(
  guardedIpcMain: IpcMainPort,
  vault: VaultRuntime,
  translator: i18n,
): DataTransferServices {
  const importService = createImportRuntime(vault.service, translator).service;
  const exportService = createExportRuntime(vault, translator).service;
  const restoreService = createRestoreRuntime(vault, translator).service;
  registerImportIpc(guardedIpcMain, importService);
  registerExportIpc(guardedIpcMain, exportService);
  registerRestoreIpc(guardedIpcMain, restoreService);
  return { importService, exportService, restoreService };
}

/**
 * 注册保险库自身的 IPC: 状态, 设置, 解锁, 锁定, 凭恢复词恢复, 查看恢复密钥与主密码开关.
 * @param guardedIpcMain 带来源校验的主进程 IPC 接口.
 * @param vault 保险库运行时对象.
 * @param translator 主进程的 i18next 实例.
 */
function registerVaultSecurityIpc(
  guardedIpcMain: IpcMainPort,
  vault: VaultRuntime,
  translator: i18n,
): void {
  registerVaultIpc(guardedIpcMain, vault.service);
  const recovery = createRecoveryRuntime(translator);
  registerRecoveryIpc(guardedIpcMain, vault.service, recovery.textFileSaver);
  registerRecoveryKeyIpc(guardedIpcMain, vault.service);
  registerMasterPasswordIpc(
    guardedIpcMain,
    vault.service,
    vault.masterPasswordVerifier,
  );
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
  const mainWindowHolder = createMainWindowHolder<BrowserWindow>();
  const guardedIpcMain = guardIpcMainByMainWindow(ipcMain, mainWindowHolder);
  registerPreferencesIpc(guardedIpcMain, runtime.service);
  registerVaultSecurityIpc(guardedIpcMain, vault, runtime.i18n);
  const entries = createEntryRuntime(vault.service);
  registerEntryIpc(guardedIpcMain, entries.service);
  registerCustomEntryTypeIpc(
    guardedIpcMain,
    createCustomEntryTypeService(vault.service),
  );
  registerFolderIpc(guardedIpcMain, createFolderService(vault.service));
  registerTagIpc(guardedIpcMain, createTagService(vault.service));
  registerBatchIpc(guardedIpcMain, createBatchService(vault.service));
  registerTotpIpc(guardedIpcMain, entries.totpService, entries.decodeQrImage);
  const attachments = createAttachmentRuntime(vault.service, runtime.i18n);
  registerAttachmentIpc(guardedIpcMain, attachments);
  const dataTransfer = registerDataTransferIpc(
    guardedIpcMain,
    vault,
    runtime.i18n,
  );
  const emailBackup = createEmailBackupRuntime(vault, runtime.i18n);
  registerEmailBackupIpc(guardedIpcMain, emailBackup.service);
  registerLockParticipants(vault.lockRegistry, {
    ...dataTransfer,
    emailBackupService: emailBackup.service,
    pauseAutoBackupUntilUnlocked: emailBackup.pauseAutoBackupUntilUnlocked,
  });
  emailBackup.discardTemporaryFiles();
  emailBackup.startAutoBackup();
  const openExternalLink = createLinkRuntime();
  registerLinkIpc(guardedIpcMain, openExternalLink);
  app.on("will-quit", () => {
    attachments.discardTemporaryCopies();
    emailBackup.stopAutoBackup();
    emailBackup.discardTemporaryFiles();
    vault.service.close();
  });
  launchMainWindow(runtime, openExternalLink, mainWindowHolder, guardedIpcMain);
}
