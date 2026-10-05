import { isExportPassphraseValid } from "@shared/export/export-limits";
import type { ExportRequest } from "@shared/export/export-request";
import type { ExportFailureReason } from "@shared/export/export-result";

/**
 * 校验导出请求里与主密码, 数据库无关的部分: 给了口令时口令必须合规; 没给口令 (不加密) 时用户必须
 * 已确认明文风险. 渲染端的界面也做同样的检查, 这里是主进程的二次校验.
 * @param request 导出请求.
 * @returns 不合规时的失败原因, 合规时为 undefined.
 */
export function findRequestViolation(
  request: ExportRequest,
): ExportFailureReason | undefined {
  if (request.passphrase !== undefined) {
    return isExportPassphraseValid(request.passphrase)
      ? undefined
      : "invalid-passphrase";
  }
  return request.hasAcknowledgedPlaintextRisk
    ? undefined
    : "plaintext-not-acknowledged";
}
