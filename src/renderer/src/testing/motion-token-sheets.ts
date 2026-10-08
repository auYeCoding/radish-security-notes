import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 样式目录, 相对本文件所在的目录.
 */
const STYLES_DIRECTORY = resolve(__dirname, "../styles");

/**
 * 语义层里减少动态效果媒体查询的起始文本.
 */
const REDUCED_MOTION_MEDIA = "@media (prefers-reduced-motion: reduce)";

/**
 * 读取样式目录下的样式文件原文. 渲染进程的测试把样式导入替换为空串, 所以直接读文件.
 * @param fileName 样式文件名.
 * @returns 样式文件的文本.
 */
function readStyleSheet(fileName: string): string {
  return readFileSync(resolve(STYLES_DIRECTORY, fileName), "utf8");
}

/**
 * 读取原始值层里全部时长的毫秒数.
 * @returns 以时长名 (例如 `base-exit`) 为键, 毫秒数为值的映射.
 */
function readPrimitiveDurations(): Map<string, number> {
  const sheet = readStyleSheet("tokens.primitives.css");
  return new Map(
    Array.from(
      sheet.matchAll(/--duration-([\w-]+):\s*(\d+)ms/g),
      (match): [string, number] => [match[1], Number(match[2])],
    ),
  );
}

/**
 * 读取语义层里动效 token 指向的原始时长名.
 * @returns 以语义 token 名 (例如 `motion-base-exit`) 为键, 原始时长名为值的映射.
 */
function readSemanticDurationAliases(): Map<string, string> {
  const [rootPart] = readStyleSheet("tokens.semantic.css").split(
    REDUCED_MOTION_MEDIA,
  );
  return new Map(
    Array.from(
      rootPart.matchAll(/--(motion-[\w-]+):\s*var\(--duration-([\w-]+)\)/g),
      (match): [string, string] => [match[1], match[2]],
    ),
  );
}

/**
 * 读取减少动态效果下被归零的动效 token 名.
 * @returns 语义 token 名列表, 例如 `motion-base-exit`.
 */
export function readReducedMotionTokens(): string[] {
  const [, reducedPart = ""] = readStyleSheet("tokens.semantic.css").split(
    REDUCED_MOTION_MEDIA,
  );
  return Array.from(
    reducedPart.matchAll(/--(motion-[\w-]+):\s*var\(--duration-none\)/g),
    (match) => match[1],
  );
}

/**
 * 取出类名文本里 `duration-(--motion-*)` 引用的动效 token 名.
 * @param classNames 类名文本.
 * @param variantPrefix 类名的变体前缀, 例如 `data-open:`, 没有变体时传空串.
 * @returns 语义 token 名列表, 例如 `motion-fast`.
 */
export function extractDurationTokens(
  classNames: string,
  variantPrefix: string,
): string[] {
  const pattern = new RegExp(
    `(?<![\\w-])${variantPrefix}duration-\\(--(motion-[\\w-]+)\\)`,
    "g",
  );
  return Array.from(classNames.matchAll(pattern), (match) => match[1]);
}

/**
 * 把语义层动效 token 换算成毫秒数.
 * @param tokenName 语义 token 名, 例如 `motion-base-exit`.
 * @returns 毫秒数.
 */
export function readTokenMilliseconds(tokenName: string): number {
  const durationName = readSemanticDurationAliases().get(tokenName);
  const milliseconds =
    durationName === undefined
      ? undefined
      : readPrimitiveDurations().get(durationName);
  if (milliseconds === undefined) {
    throw new Error(`动效 token ${tokenName} 没有对应的原始时长`);
  }
  return milliseconds;
}
