import type { ExportFormatKey } from "@shared/export/export-format-keys";

import type { ExportSerializer } from "./export-serializer";

/**
 * 序列化器的登记表.
 */
export interface ExportSerializerRegistry {
  /**
   * 按格式的键取序列化器.
   * @param key 格式的键.
   * @returns 序列化器.
   * @throws Error 当格式没有登记序列化器时.
   */
  readonly require: (key: ExportFormatKey) => ExportSerializer;
}

/**
 * 用一组序列化器创建登记表. 新增格式只需新增序列化器模块并加进这一组, 既有序列化器不用改.
 * @param serializers 序列化器列表, 每个格式的键只能出现一次.
 * @returns 登记表.
 * @throws Error 当同一个格式的键登记了两次时.
 */
export function createExportSerializerRegistry(
  serializers: readonly ExportSerializer[],
): ExportSerializerRegistry {
  const byKey = new Map<ExportFormatKey, ExportSerializer>();
  for (const serializer of serializers) {
    if (byKey.has(serializer.key)) {
      throw new Error("导出序列化器重复登记");
    }
    byKey.set(serializer.key, serializer);
  }
  return {
    require: (key) => {
      const serializer = byKey.get(key);
      if (serializer === undefined) {
        throw new Error("未登记的导出格式");
      }
      return serializer;
    },
  };
}
