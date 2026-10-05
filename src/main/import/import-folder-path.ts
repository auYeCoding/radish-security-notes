import { FOLDER_NAME_MAX_LENGTH } from "@shared/folders/folder-name-schema";
import { countCharacters } from "@shared/text/character-count";

/**
 * 来源里文件夹路径的层级分隔符.
 */
export const FOLDER_PATH_SEPARATOR = "/";

/**
 * 路径开头需要去掉的分隔符与空白.
 */
const LEADING_SEPARATORS = /^[\s/]+/;

/**
 * 规整后的文件夹名称.
 */
export interface NormalizedFolderName {
  /**
   * 本应用的文件夹名称, 来源条目没有文件夹时为 undefined.
   */
  readonly name: string | undefined;
  /**
   * 名称是否因为超过字符上限而被截成了路径尾部.
   */
  readonly isTruncated: boolean;
}

/**
 * 把来源的文件夹路径规整成本应用的单层文件夹名称: 按 `/` 切成层级, 每层去首尾空格并丢掉空层,
 * 再用 `/` 连接成完整路径作名称; 超过名称字符上限时从最内层往外取尾部.
 * @param path 来源条目的文件夹路径, 没有文件夹时为空串.
 * @returns 规整后的名称与是否被截断.
 */
export function normalizeFolderPath(path: string): NormalizedFolderName {
  const joined = path
    .split(FOLDER_PATH_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join(FOLDER_PATH_SEPARATOR);
  if (joined.length === 0) {
    return { name: undefined, isTruncated: false };
  }
  if (countCharacters(joined) <= FOLDER_NAME_MAX_LENGTH) {
    return { name: joined, isTruncated: false };
  }
  const tail = Array.from(joined)
    .slice(-FOLDER_NAME_MAX_LENGTH)
    .join("")
    .replace(LEADING_SEPARATORS, "");
  return { name: tail, isTruncated: true };
}
