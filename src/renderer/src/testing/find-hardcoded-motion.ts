/**
 * 写死毫秒的类名时长, 例如 `duration-100`, `delay-150`, `animation-duration-300`.
 */
const FIXED_DURATION_CLASS =
  /(?<![\w-])(?:animation-)?(?:duration|delay)-\d+(?![\w-])/g;

/**
 * 方括号任意值的时长与曲线类名, 例如 `duration-[120ms]`, `ease-[...]`.
 */
const ARBITRARY_TIMING_CLASS =
  /(?<![\w-])(?:animation-)?(?:duration|delay|ease)-\[[^\]]*\]/g;

/**
 * Tailwind 内置曲线类名, 例如 `ease-out`. 曲线必须取动效 token.
 */
const BUILTIN_EASE_CLASS =
  /(?<![\w-])ease-(?:linear|in|out|in-out|initial)(?![\w-])/g;

/**
 * 自定义三次贝塞尔曲线.
 */
const CUBIC_BEZIER_CURVE = /cubic-bezier\(/g;

/**
 * 样式声明里写死时间的过渡与动画, 例如 `transition: color 0.2s`.
 */
const LITERAL_TIMING_DECLARATION =
  /\b(?:transition|animation)(?:-duration|-delay)?\s*:[^;{}\n]*?\d*\.?\d+m?s\b/g;

/**
 * 在原始值层之外定义的时间自定义属性, 例如 `--motion-fast: 120ms`.
 */
const LITERAL_TIMING_VARIABLE =
  /--[\w-]*(?:duration|delay|motion)[\w-]*\s*:\s*\d*\.?\d+m?s\b/g;

/**
 * 全部写死动效取值的匹配规则.
 */
const HARDCODED_MOTION_PATTERNS: readonly RegExp[] = [
  FIXED_DURATION_CLASS,
  ARBITRARY_TIMING_CLASS,
  BUILTIN_EASE_CLASS,
  CUBIC_BEZIER_CURVE,
  LITERAL_TIMING_DECLARATION,
  LITERAL_TIMING_VARIABLE,
];

/**
 * 在源码文本里找出写死毫秒的时长与自定义曲线.
 * @param sourceText 源码文本.
 * @returns 命中的文本片段, 没有命中时是空数组.
 */
export function findHardcodedMotion(sourceText: string): string[] {
  return HARDCODED_MOTION_PATTERNS.flatMap((pattern) =>
    Array.from(sourceText.matchAll(pattern), (match) => match[0]),
  );
}
