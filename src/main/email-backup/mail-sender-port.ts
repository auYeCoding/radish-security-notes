import type { SmtpConnection } from "@shared/email-backup/smtp-connection";

/**
 * 登录 SMTP 服务器用的凭据.
 */
export interface SmtpCredentials {
  /**
   * 用户名, 即发件邮箱地址.
   */
  readonly user: string;
  /**
   * 授权码或应用专用密码.
   */
  readonly password: string;
}

/**
 * 邮件附件: 磁盘上的一个文件, 发送时流式读取.
 */
export interface MailAttachment {
  /**
   * 收件人看到的附件文件名.
   */
  readonly fileName: string;
  /**
   * 附件文件的完整路径.
   */
  readonly filePath: string;
}

/**
 * 要发出的一封邮件.
 */
export interface OutgoingMail {
  /**
   * 发件邮箱地址.
   */
  readonly from: string;
  /**
   * 收件邮箱地址.
   */
  readonly to: string;
  /**
   * 邮件主题.
   */
  readonly subject: string;
  /**
   * 纯文本正文.
   */
  readonly text: string;
  /**
   * 附件, 测试邮件没有附件.
   */
  readonly attachment?: MailAttachment;
}

/**
 * 邮件发送能力: 经加密连接把一封邮件发到 SMTP 服务器. 备份流程只依赖这个接口, 测试用不联网的
 * 替身, 生产用 nodemailer 的实现.
 */
export interface MailSenderPort {
  /**
   * 发送一封邮件. 加密连接不降级为明文, 证书校验不关闭.
   * @param connection 要连接的服务器.
   * @param credentials 登录凭据.
   * @param mail 要发出的邮件.
   * @returns 服务器接受邮件之后兑现; 认证失败, 连接失败, 被服务器拒收时拒绝, 错误里的消息
   * 不得写入日志或交给渲染端.
   */
  readonly send: (
    connection: SmtpConnection,
    credentials: SmtpCredentials,
    mail: OutgoingMail,
  ) => Promise<void>;
}
