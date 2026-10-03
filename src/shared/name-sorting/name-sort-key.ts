import { countCharacters } from "../text/character-count";
import { classifyName, type NameCategory } from "./name-category";
import { readNameStart, type NameStart } from "./name-start";

/**
 * 名称的排序键: 按类别, 字符个数, 开头依次比较.
 */
export interface NameSortKey {
  /**
   * 名称的类别.
   */
  readonly category: NameCategory;
  /**
   * 名称的字符个数.
   */
  readonly length: number;
  /**
   * 名称的开头.
   */
  readonly start: NameStart;
}

/**
 * 把名称换成排序键.
 * @param name 名称.
 * @returns 名称的排序键.
 */
export function buildNameSortKey(name: string): NameSortKey {
  return {
    category: classifyName(name),
    length: countCharacters(name),
    start: readNameStart(name),
  };
}
