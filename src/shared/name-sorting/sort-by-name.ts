import { compareNameSortKeys } from "./compare-name-sort-keys";
import { buildNameSortKey, type NameSortKey } from "./name-sort-key";

/**
 * 带名称的对象, 例如条目摘要, 文件夹摘要, 标签摘要.
 */
export interface Named {
  /**
   * 名称.
   */
  readonly name: string;
}

/**
 * 排序用的临时配对: 对象与它名称的排序键, 每个名称只算一次排序键.
 */
interface KeyedItem<T extends Named> {
  /**
   * 原对象.
   */
  readonly item: T;
  /**
   * 对象名称的排序键.
   */
  readonly key: NameSortKey;
}

/**
 * 按名称排序规则排序: 名称分纯英文, 中英混杂, 纯中文三类, 类内先比字符个数, 再比开头 (汉字取拼音首字母,
 * 数字开头排在字母之前按整数值由小到大). 排序是稳定的, 排序键完全相同的对象保持输入里的先后, 不修改
 * 入参.
 * @param items 要排序的对象.
 * @returns 排好序的新数组.
 */
export function sortByName<T extends Named>(items: readonly T[]): T[] {
  const keyed: KeyedItem<T>[] = items.map((item) => ({
    item,
    key: buildNameSortKey(item.name),
  }));
  keyed.sort((first, second) => compareNameSortKeys(first.key, second.key));
  return keyed.map((entry) => entry.item);
}
