/**
 * 标签调色板的颜色键, 按调色板里的先后排列. 数据库只存键, 色值由样式里的 `--tag-<键>` 语义
 * token 给出, 明暗主题各有取值.
 */
export const TAG_COLOR_KEYS = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "blue",
  "violet",
  "pink",
] as const;

/**
 * 调色板里的一个颜色键.
 */
export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

/**
 * 新建标签的默认颜色, 是调色板的第一种.
 */
export const DEFAULT_TAG_COLOR: TagColorKey = TAG_COLOR_KEYS[0];

/**
 * 判断一个值是否是调色板里的颜色键.
 * @param value 待判断的值.
 * @returns 是颜色键时返回 true.
 */
export function isTagColorKey(value: unknown): value is TagColorKey {
  return TAG_COLOR_KEYS.some((key) => key === value);
}
