import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createTransport, type SMTPTransportOptions } from "nodemailer";
import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import type { OutgoingMail } from "./mail-sender-port";
import {
  MAIL_ENVELOPE_OVERHEAD_BYTES,
  estimateMailSizeBytes,
} from "./mail-size-estimator";
import {
  createNodemailerMailSender,
  type MailTransport,
  type MailTransportMessage,
} from "./nodemailer-mail-sender";
import {
  SMTP_CONNECTION_TIMEOUT_MILLISECONDS,
  SMTP_GREETING_TIMEOUT_MILLISECONDS,
  SMTP_MINIMUM_TLS_VERSION,
  SMTP_SOCKET_TIMEOUT_MILLISECONDS,
} from "./smtp-transport-options";

/**
 * 测试用的 SSL 服务器.
 */
const SSL_CONNECTION = {
  host: "smtp.example.com",
  port: 465,
  security: "ssl",
} as const;

/**
 * 测试用的凭据.
 */
const CREDENTIALS = { user: "alice@example.com", password: "secret-code" };

/**
 * 测试用的没有附件的邮件.
 */
const PLAIN_MAIL: OutgoingMail = {
  from: "a@example.com",
  to: "b@example.com",
  subject: "s",
  text: "t",
};

/**
 * 记录传输对象工厂调用情况的替身.
 */
interface RecordingFactory {
  /**
   * 传给适配层的传输对象工厂.
   */
  readonly createTransport: (options: SMTPTransportOptions) => MailTransport;
  /**
   * 工厂收到的全部 SMTP 选项.
   */
  readonly options: SMTPTransportOptions[];
  /**
   * 传输对象收到的全部邮件.
   */
  readonly messages: MailTransportMessage[];
  /**
   * 每次关闭传输对象时追加一项, 长度就是被关闭的次数.
   */
  readonly closes: true[];
}

/**
 * 创建一个记录选项与邮件的替身传输对象工厂.
 * @param sendError 发送时抛出的错误, 没有时发送成功.
 * @returns 工厂与它记下的内容.
 */
function recordingFactory(sendError?: Error): RecordingFactory {
  const options: SMTPTransportOptions[] = [];
  const messages: MailTransportMessage[] = [];
  const closes: true[] = [];
  return {
    createTransport: (given) => {
      options.push(given);
      return {
        sendMail: async (message) => {
          messages.push(message);
          if (sendError !== undefined) {
            throw sendError;
          }
        },
        close: () => {
          closes.push(true);
        },
      };
    },
    options,
    messages,
    closes,
  };
}

/**
 * 创建带一个附件的邮件.
 * @param filePath 附件文件的路径.
 * @returns 要发出的邮件.
 */
function mailWithAttachment(filePath: string): OutgoingMail {
  return {
    ...PLAIN_MAIL,
    subject: "subject",
    text: "body",
    attachment: { fileName: "backup.zip.age", filePath },
  };
}

describe("nodemailer 适配层: SSL 与 STARTTLS 的传输选项", () => {
  it("SSL 连接用 secure, 不用 requireTLS, 凭据只进 auth", async () => {
    const factory = recordingFactory();
    await createNodemailerMailSender(factory).send(
      SSL_CONNECTION,
      CREDENTIALS,
      PLAIN_MAIL,
    );
    expect(factory.options[0]).toEqual({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      requireTLS: false,
      auth: { user: "alice@example.com", pass: "secret-code" },
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MILLISECONDS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MILLISECONDS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MILLISECONDS,
      logger: false,
      disableUrlAccess: true,
      tls: { minVersion: SMTP_MINIMUM_TLS_VERSION },
    });
  });

  it("STARTTLS 连接用 requireTLS, 不允许降级或关闭证书校验", async () => {
    const factory = recordingFactory();
    await createNodemailerMailSender(factory).send(
      { host: "smtp.example.com", port: 587, security: "starttls" },
      CREDENTIALS,
      PLAIN_MAIL,
    );
    const given = factory.options[0];
    expect(given).toMatchObject({ secure: false, requireTLS: true, port: 587 });
    expect(given).not.toHaveProperty("ignoreTLS");
    expect(given).not.toHaveProperty("opportunisticTLS");
    expect(given?.tls).toEqual({ minVersion: "TLSv1.2" });
    expect(JSON.stringify(given)).not.toContain("rejectUnauthorized");
  });
});

describe("nodemailer 适配层: 传输对象的生命周期与邮件内容", () => {
  it("发送失败时错误原样抛出, 传输对象仍然被关闭", async () => {
    const failing = recordingFactory(new Error("boom"));
    await expect(
      createNodemailerMailSender(failing).send(
        SSL_CONNECTION,
        CREDENTIALS,
        PLAIN_MAIL,
      ),
    ).rejects.toThrow("boom");
    expect(failing.closes).toHaveLength(1);
  });

  it("邮件的收发地址, 主题, 正文与附件路径原样交给传输对象", async () => {
    const factory = recordingFactory();
    await createNodemailerMailSender(factory).send(
      SSL_CONNECTION,
      CREDENTIALS,
      mailWithAttachment("/x/backup"),
    );
    expect(factory.messages).toEqual([
      {
        from: "a@example.com",
        to: "b@example.com",
        subject: "subject",
        text: "body",
        attachments: [{ filename: "backup.zip.age", path: "/x/backup" }],
      },
    ]);
  });
});

describe("nodemailer 适配层: 真实 nodemailer 组装的邮件", () => {
  const getDirectory = useTemporaryDirectory("nodemailer-compose");

  it("附件内容与文件逐字节一致", async () => {
    const filePath = join(getDirectory(), "backup.bin");
    const content = randomBytes(50_000);
    await writeFile(filePath, content);
    const composed: string[] = [];
    const sender = createNodemailerMailSender({
      createTransport: () => {
        const real = createTransport({ jsonTransport: true });
        return {
          sendMail: async (message) => {
            const info = await real.sendMail(message);
            composed.push(String(info.message));
          },
          close: () => real.close(),
        };
      },
    });
    await sender.send(
      SSL_CONNECTION,
      CREDENTIALS,
      mailWithAttachment(filePath),
    );
    const mail = JSON.parse(composed[0] ?? "{}");
    expect(mail.subject).toBe("subject");
    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments[0].filename).toBe("backup.zip.age");
    expect(Buffer.from(mail.attachments[0].content, "base64")).toEqual(content);
  });
});

describe("nodemailer 适配层: 大小估计用真实邮件校准", () => {
  const getDirectory = useTemporaryDirectory("nodemailer-estimate");

  it.each([0, 1, 1000, 100_000, 3_000_000])(
    "估计不小于真实邮件, 差距不超过封装开销: 附件 %i 字节",
    async (size) => {
      const filePath = join(getDirectory(), "backup.bin");
      await writeFile(filePath, randomBytes(size));
      const raw: Buffer[] = [];
      const sender = createNodemailerMailSender({
        createTransport: () => {
          const real = createTransport({
            streamTransport: true,
            buffer: true,
            newline: "windows",
          });
          return {
            sendMail: async (message) => {
              const info = await real.sendMail(message);
              if (Buffer.isBuffer(info.message)) {
                raw.push(info.message);
              }
            },
            close: () => real.close(),
          };
        },
      });
      await sender.send(
        SSL_CONNECTION,
        CREDENTIALS,
        mailWithAttachment(filePath),
      );
      const actual = raw[0]?.length ?? 0;
      const estimated = estimateMailSizeBytes(size);
      expect(actual).toBeGreaterThan(0);
      expect(estimated).toBeGreaterThanOrEqual(actual);
      expect(estimated - actual).toBeLessThanOrEqual(
        MAIL_ENVELOPE_OVERHEAD_BYTES,
      );
    },
  );
});
