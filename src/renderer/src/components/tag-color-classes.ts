import type { TagColorKey } from "@shared/tags/tag-colors";

/**
 * 调色板里每种颜色对应的背景类名. 类名写成完整字面量, 让 Tailwind 能在源码里扫描到它们;
 * 颜色值来自 `theme.css` 映射的 `--color-tag-*`, 明暗主题各有取值.
 */
export const TAG_COLOR_CLASS_NAMES: Readonly<Record<TagColorKey, string>> = {
  slate: "bg-tag-slate",
  red: "bg-tag-red",
  orange: "bg-tag-orange",
  amber: "bg-tag-amber",
  green: "bg-tag-green",
  blue: "bg-tag-blue",
  violet: "bg-tag-violet",
  pink: "bg-tag-pink",
};
