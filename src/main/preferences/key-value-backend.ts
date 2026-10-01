/**
 * 偏好存储的底层读写接口, 隔离具体的持久化库, 便于测试时换成内存实现.
 */
export interface KeyValueBackend {
  /**
   * 读取一个键的值.
   * @param key 键名.
   * @returns 已保存的值, 没有保存过时为 undefined.
   */
  get: (key: string) => unknown;
  /**
   * 保存一个键的值.
   * @param key 键名.
   * @param value 要保存的值.
   */
  set: (key: string, value: unknown) => void;
}
