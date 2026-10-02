/**
 * 把意外失败写入控制台. 只输出错误名称与信息, 不输出底层原因与任何密钥材料.
 * @param scope 失败所属的功能, 写在行首的方括号里.
 * @param error 底层错误.
 */
export function reportFailure(scope: string, error: unknown): void {
  const description =
    error instanceof Error ? `${error.name}: ${error.message}` : "未知错误";
  console.error(`[${scope}] 操作失败, ${description}`);
}
