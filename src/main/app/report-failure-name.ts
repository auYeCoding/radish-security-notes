/**
 * 未知错误的描述, 抛出的不是错误对象时使用.
 */
const UNKNOWN_ERROR_NAME = "未知错误";

/**
 * 把意外失败写入控制台. 只输出错误名称, 不输出错误信息与底层原因, 避免用户填写的内容经
 * 错误信息进入日志.
 * @param scope 失败所属的功能, 写在行首的方括号里.
 * @param error 底层错误.
 */
export function reportFailureName(scope: string, error: unknown): void {
  const name = error instanceof Error ? error.name : UNKNOWN_ERROR_NAME;
  console.error(`[${scope}] 操作失败, ${name}`);
}
