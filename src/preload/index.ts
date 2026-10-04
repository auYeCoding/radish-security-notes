import { electronAPI } from "@electron-toolkit/preload";
import type { RendererApi } from "@shared/ipc/renderer-api";
import { contextBridge, ipcRenderer, webUtils } from "electron";

import { createAttachmentBridge } from "./create-attachment-bridge";
import { createBatchBridge } from "./create-batch-bridge";
import { createEntryBridge } from "./create-entry-bridge";
import { createFolderBridge } from "./create-folder-bridge";
import { createPreferencesBridge } from "./create-preferences-bridge";
import { createRecoveryBridge } from "./create-recovery-bridge";
import { createTagBridge } from "./create-tag-bridge";
import { createTotpBridge } from "./create-totp-bridge";
import { createVaultBridge } from "./create-vault-bridge";

/**
 * 暴露给渲染进程的自定义 API 集合.
 */
const api: RendererApi = {
  preferences: createPreferencesBridge(ipcRenderer),
  vault: createVaultBridge(ipcRenderer),
  recovery: createRecoveryBridge(ipcRenderer),
  entries: createEntryBridge(ipcRenderer),
  folders: createFolderBridge(ipcRenderer),
  tags: createTagBridge(ipcRenderer),
  batch: createBatchBridge(ipcRenderer),
  totp: createTotpBridge(ipcRenderer),
  attachments: createAttachmentBridge({
    ipcRenderer,
    getPathForFile: (file) => webUtils.getPathForFile(file),
  }),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
