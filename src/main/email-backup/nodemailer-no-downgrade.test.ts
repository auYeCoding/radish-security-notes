import { createServer, type AddressInfo, type Server } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";
import type { SmtpConnection } from "@shared/email-backup/smtp-connection";

import { classifyMailSendError } from "./mail-send-error-classifier";
import { createNodemailerMailSender } from "./nodemailer-mail-sender";

/**
 * 测试用的凭据, 授权码里的文字用来确认它没有被发到只会说明文的服务器.
 */
const CREDENTIALS = { user: "alice@example.com", password: "SECRET-CODE-123" };

/**
 * 测试用的邮件.
 */
const MAIL = {
  from: "alice@example.com",
  to: "alice@example.com",
  subject: "subject",
  text: "body",
};

/**
 * 一个只会说明文 SMTP 的本机服务器: 声明支持 AUTH 却拒绝 STARTTLS, 记下收到的每一行.
 */
interface PlainSmtpServer {
  /**
   * 监听的端口.
   */
  readonly port: number;
  /**
   * 服务器收到的全部命令行.
   */
  readonly received: string[];
  /**
   * 底层的服务器, 测试结束时关闭.
   */
  readonly server: Server;
}

/**
 * 回应一行 SMTP 命令: 声明 AUTH 与大小, 拒绝 STARTTLS, 其余都说好.
 * @param line 收到的命令行.
 * @returns 要回给客户端的响应.
 */
function replyTo(line: string): string {
  if (/^EHLO/i.test(line)) {
    return "250-fake\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 1000000\r\n";
  }
  return /^STARTTLS/i.test(line)
    ? "502 STARTTLS not available\r\n"
    : "250 ok\r\n";
}

/**
 * 启动只会说明文的本机服务器, 只监听 127.0.0.1, 不联网.
 * @returns 服务器与它收到的命令行.
 */
function startPlainSmtpServer(): Promise<PlainSmtpServer> {
  const received: string[] = [];
  const server = createServer((socket) => {
    socket.write("220 fake ESMTP\r\n");
    socket.on("data", (chunk) => {
      for (const line of chunk.toString("latin1").split("\r\n")) {
        if (line !== "") {
          received.push(line);
          socket.write(replyTo(line));
        }
      }
    });
    socket.on("error", () => undefined);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ port, received, server });
    });
  });
}

/**
 * 用真实的 nodemailer 适配层向本机服务器发一封邮件.
 * @param connection 要连接的服务器.
 * @returns 发送失败时的错误, 意外发送成功时为 undefined.
 */
async function sendAndCatch(
  connection: SmtpConnection,
): Promise<unknown | undefined> {
  try {
    await createNodemailerMailSender().send(connection, CREDENTIALS, MAIL);
    return undefined;
  } catch (error) {
    return error;
  }
}

/**
 * 服务器收到的内容里有没有授权码, 含 base64 编码后的 AUTH 参数.
 * @param received 服务器收到的命令行.
 * @returns 出现授权码时为 true.
 */
function sawSecret(received: readonly string[]): boolean {
  return received.some(
    (line) =>
      line.includes("SECRET") ||
      Buffer.from(line, "base64").toString().includes("SECRET"),
  );
}

describe("不降级为明文: 对只会说明文的服务器", () => {
  let current: PlainSmtpServer | undefined;
  afterEach(() => {
    current?.server.close();
  });

  it("STARTTLS 连接遇到拒绝升级的服务器就失败, 不发送授权码与邮件", async () => {
    current = await startPlainSmtpServer();
    const error = await sendAndCatch({
      host: "127.0.0.1",
      port: current.port,
      security: "starttls",
    });
    const reason: EmailBackupFailureReason = classifyMailSendError(error);
    expect(error).toMatchObject({ code: "ETLS" });
    expect(reason).toBe("connection-failed");
    expect(current.received.some((line) => /^STARTTLS/i.test(line))).toBe(true);
    expect(current.received.some((line) => /^AUTH/i.test(line))).toBe(false);
    expect(
      current.received.some((line) => /^(MAIL|RCPT|DATA)/i.test(line)),
    ).toBe(false);
    expect(sawSecret(current.received)).toBe(false);
  });

  it("SSL 连接遇到只会说明文的服务器就失败, 不发送授权码与邮件", async () => {
    current = await startPlainSmtpServer();
    const error = await sendAndCatch({
      host: "127.0.0.1",
      port: current.port,
      security: "ssl",
    });
    expect(error).toBeInstanceOf(Error);
    expect(classifyMailSendError(error)).toBe("connection-failed");
    expect(current.received.some((line) => /^AUTH/i.test(line))).toBe(false);
    expect(sawSecret(current.received)).toBe(false);
  });
});
