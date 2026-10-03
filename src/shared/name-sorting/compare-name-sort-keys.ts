import { compareDigitStrings } from "./compare-digit-strings";
import type { NameSortKey } from "./name-sort-key";
import { NAME_START_GROUP, type NameStart } from "./name-start";

/**
 * 比较两个名称开头: 先比分组, 同为数字组时按整数值比, 其它组按组内次序比.
 * @param first 第一个开头.
 * @param second 第二个开头.
 * @returns 第一个靠前时为负数, 相同时为 0, 靠后时为正数.
 */
function compareNameStarts(first: NameStart, second: NameStart): number {
  if (first.group !== second.group) {
    return first.group - second.group;
  }
  if (first.group === NAME_START_GROUP.digit) {
    return compareDigitStrings(first.digits, second.digits);
  }
  return first.rank - second.rank;
}

/**
 * 比较两个名称的排序键: 先比类别, 类别相同比字符个数, 再比开头. 全部相同时返回 0, 由稳定排序保持
 * 原有先后.
 * @param first 第一个排序键.
 * @param second 第二个排序键.
 * @returns 第一个靠前时为负数, 相同时为 0, 靠后时为正数.
 */
export function compareNameSortKeys(
  first: NameSortKey,
  second: NameSortKey,
): number {
  if (first.category !== second.category) {
    return first.category - second.category;
  }
  if (first.length !== second.length) {
    return first.length - second.length;
  }
  return compareNameStarts(first.start, second.start);
}
