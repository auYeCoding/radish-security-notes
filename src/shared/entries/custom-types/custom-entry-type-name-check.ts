import { isSameName } from "../../text/is-same-name";
import { PRESET_TYPE_NAMES } from "../preset-type-names";

/**
 * 判断自定义类型的名称是否已被占用: 与任一预设类型的中文名, 英文名, 或任一已有自定义类型的名称
 * 同名. 同名的判定与文件夹, 标签一致: 去首尾空格后忽略英文字母的大小写.
 * @param name 已校验的类型名称.
 * @param existingNames 已有自定义类型的名称.
 * @returns 名称已被占用时返回 true.
 */
export function isCustomTypeNameTaken(
  name: string,
  existingNames: readonly string[],
): boolean {
  return [...PRESET_TYPE_NAMES, ...existingNames].some((taken) =>
    isSameName(taken, name),
  );
}
