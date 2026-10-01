import { electronAPI } from "@electron-toolkit/preload";
import type { RendererApi } from "@shared/ipc/renderer-api";
import { contextBridge, ipcRenderer } from "electron";

import { createPreferencesBridge } from "./create-preferences-bridge";
import { createVaultBridge } from "./create-vault-bridge";

/**
 * 暴露给渲染进程的自定义 API 集合.
 */
const api: RendererApi = {
  preferences: createPreferencesBridge(ipcRenderer),
  vault: createVaultBridge(ipcRenderer),
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
