import type { RendererApi } from "@shared/ipc/renderer-api";
import { contextBridge, ipcRenderer, webUtils } from "electron";

import { createAttachmentBridge } from "./create-attachment-bridge";
import { createBatchBridge } from "./create-batch-bridge";
import { createEmailBackupBridge } from "./create-email-backup-bridge";
import { createEntryBridge } from "./create-entry-bridge";
import { createEntryTypeBridge } from "./create-entry-type-bridge";
import { createExportBridge } from "./create-export-bridge";
import { createFolderBridge } from "./create-folder-bridge";
import { createImportBridge } from "./create-import-bridge";
import { createLinkBridge } from "./create-link-bridge";
import { createMasterPasswordBridge } from "./create-master-password-bridge";
import { createPreferencesBridge } from "./create-preferences-bridge";
import { createRecoveryBridge } from "./create-recovery-bridge";
import { createRestoreBridge } from "./create-restore-bridge";
import { createTagBridge } from "./create-tag-bridge";
import { createTotpBridge } from "./create-totp-bridge";
import { createVaultBridge } from "./create-vault-bridge";
import { createVaultEventsBridge } from "./create-vault-events-bridge";
import { createWindowControlsBridge } from "./create-window-controls-bridge";

/**
 * 暴露给渲染进程的自定义 API 集合.
 */
const api: RendererApi = {
  preferences: createPreferencesBridge(ipcRenderer),
  vault: createVaultBridge(ipcRenderer),
  vaultEvents: createVaultEventsBridge(ipcRenderer),
  recovery: createRecoveryBridge(ipcRenderer),
  masterPassword: createMasterPasswordBridge(ipcRenderer),
  entries: createEntryBridge(ipcRenderer),
  entryTypes: createEntryTypeBridge(ipcRenderer),
  folders: createFolderBridge(ipcRenderer),
  tags: createTagBridge(ipcRenderer),
  batch: createBatchBridge(ipcRenderer),
  totp: createTotpBridge(ipcRenderer),
  attachments: createAttachmentBridge({
    ipcRenderer,
    getPathForFile: (file) => webUtils.getPathForFile(file),
  }),
  importer: createImportBridge(ipcRenderer),
  exporter: createExportBridge(ipcRenderer),
  emailBackup: createEmailBackupBridge(ipcRenderer),
  restorer: createRestoreBridge(ipcRenderer),
  links: createLinkBridge(ipcRenderer),
  windowControls: createWindowControlsBridge(ipcRenderer),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.api = api;
}
