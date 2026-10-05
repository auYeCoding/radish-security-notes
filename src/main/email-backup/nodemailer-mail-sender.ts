import { createTransport, type SMTPTransportOptions } from "nodemailer";

import type { MailSenderPort } from "./mail-sender-port";
import { buildSmtpTransportOptions } from "./smtp-transport-options";

/**
 * 交给 nodemailer 的一个附件.
 */
export interface MailTransportAttachment {
  /**
   * 收件人看到的附件文件名.
   */
  readonly filename: string;
  /**
   * 附件文件的完整路径, 由 nodemailer 流式读取.
   */
  readonly path: string;
}

/**
 * 交给 nodemailer 的一封邮件.
 */
export interface MailTransportMessage {
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
   * 附件列表, 每个附件按路径流式读取. 数组类型与 nodemailer 的参数一致, 不是只读数组.
   */
  readonly attachments: MailTransportAttachment[];
}

/**
 * nodemailer 的传输对象中备份用到的部分.
 */
export interface MailTransport {
  /**
   * 发送一封邮件.
   * @param message 要发送的邮件.
   * @returns 服务器接受之后兑现.
   */
  readonly sendMail: (message: MailTransportMessage) => Promise<unknown>;
  /**
   * 关闭传输对象.
   */
  readonly close: () => void;
}

/**
 * nodemailer 适配层的依赖.
 */
export interface NodemailerMailSenderDependencies {
  /**
   * 按 SMTP 选项创建传输对象, 测试里换成不联网的替身.
   */
  readonly createTransport: (options: SMTPTransportOptions) => MailTransport;
}

/**
 * 默认的传输对象工厂: 直接用 nodemailer 的 SMTP 传输.
 */
const NODEMAILER_DEPENDENCIES: NodemailerMailSenderDependencies = {
  createTransport: (options) => createTransport(options),
};

/**
 * 创建基于 nodemailer 的邮件发送能力. 每封邮件新建一个传输对象, 发完关闭. 错误原样抛出, 由调用方
 * 分类, 错误里的消息不在这里写日志.
 * @param dependencies 适配层依赖, 不给时用 nodemailer 的 SMTP 传输.
 * @returns 邮件发送能力.
 */
export function createNodemailerMailSender(
  dependencies: NodemailerMailSenderDependencies = NODEMAILER_DEPENDENCIES,
): MailSenderPort {
  return {
    send: async (connection, credentials, mail) => {
      const transport = dependencies.createTransport(
        buildSmtpTransportOptions(connection, credentials),
      );
      try {
        await transport.sendMail({
          from: mail.from,
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
          attachments:
            mail.attachment === undefined
              ? []
              : [
                  {
                    filename: mail.attachment.fileName,
                    path: mail.attachment.filePath,
                  },
                ],
        });
      } finally {
        transport.close();
      }
    },
  };
}
