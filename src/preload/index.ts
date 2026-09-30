import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * 暴露给渲染进程的自定义 API 集合.
 */
const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
