import type { PreferencesBridge } from "../preferences/preferences-bridge";
import type { VaultBridge } from "../vault/vault-bridge";

/**
 * preload 经 `contextBridge` 暴露在 `window.api` 上的全部接口.
 */
export interface RendererApi {
  /**
   * 偏好读写接口.
   */
  readonly preferences: PreferencesBridge;
  /**
   * 保险库接口: 查询启动状态, 设置主密码, 跳过, 解锁.
   */
  readonly vault: VaultBridge;
}
