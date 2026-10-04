/**
 * 批量参数不合规时的错误信息.
 */
const INVALID_BATCH_ARGUMENT_MESSAGE = "无效的批量参数";

/**
 * 校验渲染进程传来的编号是字符串.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的编号.
 * @throws Error 当参数不是字符串时.
 */
export function requireIdentifier(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(INVALID_BATCH_ARGUMENT_MESSAGE);
  }
  return value;
}

/**
 * 校验渲染进程传来的编号可省略, 给出时是字符串.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的编号, 省略时为 undefined.
 * @throws Error 当参数存在却不是字符串时.
 */
export function requireOptionalIdentifier(value: unknown): string | undefined {
  return value === undefined ? undefined : requireIdentifier(value);
}

/**
 * 校验渲染进程传来的条目编号列表是由字符串组成的数组. 列表是否为空, 条目是否存在由服务判定.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的编号列表.
 * @throws Error 当参数不是数组, 或数组里有不是字符串的元素时.
 */
export function requireIdentifierList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(INVALID_BATCH_ARGUMENT_MESSAGE);
  }
  return value.map((item: unknown) => requireIdentifier(item));
}
