import {
  restoreProblem,
  type RestoreProblem,
  type RestoreProblemSection,
} from "@shared/restore/restore-problem";
import { foldForComparison } from "@shared/text/is-same-name";

import { findDuplicatePosition } from "./restore-duplicate-finder";

/**
 * 一个带编号与名称的项, 文件夹, 标签与自定义类型都是.
 */
export interface NamedItem {
  /**
   * 项的编号.
   */
  readonly id: string;
  /**
   * 项的名称.
   */
  readonly name: string;
}

/**
 * 检查一个区段里带名称的项: 编号互不重复, 名称各自合规, 名称按应用同名规则 (去首尾空格, 忽略
 * A-Z 大小写) 互不重名.
 * @param section 区段.
 * @param items 区段里的项.
 * @param isNameValid 判断一个名称是否合规的函数.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
export function checkNamedItems<Item extends NamedItem>(
  section: RestoreProblemSection,
  items: readonly Item[],
  isNameValid: (item: Item) => boolean,
): RestoreProblem | undefined {
  const duplicateId = findDuplicatePosition(items.map((item) => item.id));
  if (duplicateId !== undefined) {
    return restoreProblem(section, "duplicate-id", duplicateId);
  }
  const invalidIndex = items.findIndex((item) => !isNameValid(item));
  if (invalidIndex >= 0) {
    return restoreProblem(section, "invalid-value", invalidIndex + 1);
  }
  const duplicateName = findDuplicatePosition(
    items.map((item) => foldForComparison(item.name)),
  );
  return duplicateName === undefined
    ? undefined
    : restoreProblem(section, "duplicate-name", duplicateName);
}
