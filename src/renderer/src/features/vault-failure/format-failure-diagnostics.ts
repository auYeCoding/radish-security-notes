import type { VaultFailureInfo } from "@shared/vault/vault-failure";

/**
 * 把失败信息排成一行可复制的诊断文本: 原因代码, 阶段, 以及有底层错误时的错误类名. 文本里没有
 * 主密码, 数据密钥与错误消息正文.
 * @param failure 主进程记录的失败信息.
 * @returns 诊断文本.
 */
export function formatFailureDiagnostics(failure: VaultFailureInfo): string {
  const fields = [`cause=${failure.cause}`, `stage=${failure.stage}`];
  if (failure.errorName !== undefined) {
    fields.push(`error=${failure.errorName}`);
  }
  return fields.join("; ");
}
