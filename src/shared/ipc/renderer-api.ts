import type { PreferencesBridge } from "../preferences/preferences-bridge";

/**
 * preload 经 `contextBridge` 暴露在 `window.api` 上的全部接口.
 */
export interface RendererApi {
  /**
   * 偏好读写接口.
   */
  readonly preferences: PreferencesBridge;
}
