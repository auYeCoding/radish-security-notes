/**
 * 3px 宽的外圈类名: `ring-3` 与 `ring-[3px]`, 带不带状态前缀都算.
 */
const THREE_PIXEL_RING_CLASS = /(?<![\w-])ring-(?:3|\[3px\])(?![\w-])/g;

/**
 * 挂在聚焦或错误状态上的外圈类名, 例如 `focus-visible:ring-ring/50`,
 * `aria-invalid:ring-destructive/20`, `has-aria-invalid:ring-destructive/20`. 聚焦与错误的
 * 描边只用边框变色或轮廓表达, 不再用外圈.
 */
const STATE_RING_CLASS = /[^\s"'`]*(?:focus|invalid)[^\s"'`]*:ring-[^\s"'`]+/g;

/**
 * 全部聚焦与错误外圈的匹配规则.
 */
const THICK_FOCUS_RING_PATTERNS: readonly RegExp[] = [
  THREE_PIXEL_RING_CLASS,
  STATE_RING_CLASS,
];

/**
 * 在源码文本里找出 3px 外圈, 以及挂在聚焦或错误状态上的外圈.
 * @param sourceText 源码文本.
 * @returns 命中的文本片段, 没有命中时是空数组.
 */
export function findThickFocusRings(sourceText: string): string[] {
  return THICK_FOCUS_RING_PATTERNS.flatMap((pattern) =>
    Array.from(sourceText.matchAll(pattern), (match) => match[0]),
  );
}
