import { useEntryStore } from "./use-entry-store";

/**
 * 读取某个类型下已有的条目个数, 条目列表变化时才重新渲染. 编辑与删除自定义类型的确认用它写明
 * 受影响的条目数.
 * @param typeKey 类型键.
 * @returns 该类型下的条目个数.
 */
export function useEntryCountOfType(typeKey: string): number {
  return useEntryStore(
    (state) => state.entries.filter((entry) => entry.type === typeKey).length,
  );
}
