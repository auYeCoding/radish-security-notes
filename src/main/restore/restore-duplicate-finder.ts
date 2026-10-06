/**
 * 找出一列值里第一个与前面重复的值所在的序号.
 * @param values 按顺序排列的值.
 * @returns 第一个重复值的序号 (从 1 起), 没有重复时为 undefined.
 */
export function findDuplicatePosition(
  values: readonly string[],
): number | undefined {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      return index + 1;
    }
    seen.add(value);
  }
  return undefined;
}
