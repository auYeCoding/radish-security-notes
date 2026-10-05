import type { ImportSourceKey } from "@shared/import/import-source-keys";

import type { ImportSourceAdapter } from "./source-adapter";

/**
 * 来源适配器的登记表.
 */
export interface SourceRegistry {
  /**
   * 按来源的键找适配器.
   * @param key 来源的键.
   * @returns 适配器, 没有登记时为 undefined.
   */
  readonly find: (key: ImportSourceKey) => ImportSourceAdapter | undefined;
}

/**
 * 用一组适配器创建登记表. 新增来源只需新增适配器模块并加进这一组, 既有适配器不用改.
 * @param adapters 适配器列表, 每个来源的键只能出现一次.
 * @returns 登记表.
 * @throws Error 当同一个来源的键登记了两次时.
 */
export function createSourceRegistry(
  adapters: readonly ImportSourceAdapter[],
): SourceRegistry {
  const byKey = new Map<ImportSourceKey, ImportSourceAdapter>();
  for (const adapter of adapters) {
    if (byKey.has(adapter.key)) {
      throw new Error("来源适配器重复登记");
    }
    byKey.set(adapter.key, adapter);
  }
  return { find: (key) => byKey.get(key) };
}
