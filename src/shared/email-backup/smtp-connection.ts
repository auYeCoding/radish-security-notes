import type { EmailBackupSettings } from "./email-backup-settings";
import {
  EMAIL_PROVIDER_PRESETS,
  type EmailConnectionSecurity,
} from "./email-provider-presets";

/**
 * 实际要连接的 SMTP 服务器.
 */
export interface SmtpConnection {
  /**
   * 服务器地址.
   */
  readonly host: string;
  /**
   * 服务器端口.
   */
  readonly port: number;
  /**
   * 加密连接的方式.
   */
  readonly security: EmailConnectionSecurity;
}

/**
 * 由设置得出实际要连接的服务器: 预置类型取预置表, 不信任存储里的值, 自定义类型取用户填写的值.
 * @param settings 邮箱备份设置.
 * @returns 实际要连接的服务器.
 */
export function resolveSmtpConnection(
  settings: EmailBackupSettings,
): SmtpConnection {
  if (settings.provider === "custom") {
    return {
      host: settings.host,
      port: settings.port,
      security: settings.security,
    };
  }
  const preset = EMAIL_PROVIDER_PRESETS[settings.provider];
  return { host: preset.host, port: preset.port, security: preset.security };
}

/**
 * 判断连接目标是否变了: 邮箱类型, 服务器, 端口, 连接方式, 发件地址任一项不同. 目标变了, 已保存的
 * 授权码就不能再用, 防止改了服务器后把已存的授权码发给新地址. 主进程用它拒绝保存, 渲染端用它提示
 * 要重新填写授权码.
 * @param next 要保存的设置.
 * @param previous 已保存的设置.
 * @returns 连接目标变了时为 true.
 */
export function hasConnectionTargetChanged(
  next: EmailBackupSettings,
  previous: EmailBackupSettings,
): boolean {
  const nextConnection = resolveSmtpConnection(next);
  const previousConnection = resolveSmtpConnection(previous);
  return (
    next.provider !== previous.provider ||
    nextConnection.host !== previousConnection.host ||
    nextConnection.port !== previousConnection.port ||
    nextConnection.security !== previousConnection.security ||
    next.senderAddress !== previous.senderAddress
  );
}
