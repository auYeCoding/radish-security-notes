import Store from "electron-store";

import type { KeyValueBackend } from "./key-value-backend";

/**
 * 偏好文件的名称, 保存在应用的用户数据目录下.
 */
const PREFERENCES_FILE_NAME = "preferences";

/**
 * 创建以 electron-store 为底层的偏好存储后端.
 * @returns 读写用户数据目录下偏好文件的后端.
 */
export function createElectronStoreBackend(): KeyValueBackend {
  const store = new Store<Record<string, unknown>>({
    name: PREFERENCES_FILE_NAME,
  });
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
  };
}
