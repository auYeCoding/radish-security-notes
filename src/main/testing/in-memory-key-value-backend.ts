import type { KeyValueBackend } from "../preferences/key-value-backend";

/**
 * 创建以内存 Map 为底层的偏好存储后端, 仅供测试使用.
 * @param initialValues 初始已保存的键值.
 * @returns 内存后端.
 */
export function createInMemoryKeyValueBackend(
  initialValues: Readonly<Record<string, unknown>> = {},
): KeyValueBackend {
  const values = new Map<string, unknown>(Object.entries(initialValues));
  return {
    get: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value);
    },
  };
}
