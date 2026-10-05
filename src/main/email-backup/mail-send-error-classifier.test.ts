import { describe, expect, it } from "vitest";

import { classifyMailSendError } from "./mail-send-error-classifier";

/**
 * 构造带 nodemailer 错误属性的错误.
 * @param properties 错误上的属性.
 * @returns 错误对象.
 */
function errorWith(properties: Record<string, unknown>): Error {
  return Object.assign(new Error("server said something private"), properties);
}

describe("发送错误分类: 认证失败与连接失败", () => {
  it.each(["EAUTH", "ENOAUTH"])("错误码 %s 是认证失败", (code) => {
    expect(classifyMailSendError(errorWith({ code }))).toBe(
      "authentication-failed",
    );
  });

  it.each([530, 534, 535])("响应码 %i 是认证失败", (responseCode) => {
    expect(
      classifyMailSendError(errorWith({ code: "EENVELOPE", responseCode })),
    ).toBe("authentication-failed");
  });

  it.each(["ECONNECTION", "ESOCKET", "ETIMEDOUT", "EDNS", "ETLS"])(
    "错误码 %s 是连接失败",
    (code) => {
      expect(classifyMailSendError(errorWith({ code }))).toBe(
        "connection-failed",
      );
    },
  );

  it("认证失败优先于连接类错误码", () => {
    expect(
      classifyMailSendError(errorWith({ code: "ETLS", responseCode: 535 })),
    ).toBe("authentication-failed");
  });
});

describe("发送错误分类: 邮件过大与其它", () => {
  it("响应码 552 是服务器因邮件过大拒收", () => {
    expect(
      classifyMailSendError(
        errorWith({ code: "EENVELOPE", responseCode: 552 }),
      ),
    ).toBe("server-rejected-size");
  });

  it("发送前发现超出服务器声明的大小也是邮件过大", () => {
    expect(
      classifyMailSendError(
        errorWith({ code: "EMESSAGE", command: "MAIL FROM" }),
      ),
    ).toBe("server-rejected-size");
  });

  it("数据阶段的 EMESSAGE 不是邮件过大, 是其它失败", () => {
    expect(
      classifyMailSendError(
        errorWith({ code: "EMESSAGE", command: "DATA", responseCode: 554 }),
      ),
    ).toBe("send-failed");
  });

  it("其它错误码, 没有错误码, 不是错误对象都是其它失败", () => {
    expect(classifyMailSendError(errorWith({ code: "EPROTOCOL" }))).toBe(
      "send-failed",
    );
    expect(classifyMailSendError(new Error("plain"))).toBe("send-failed");
    expect(classifyMailSendError("text")).toBe("send-failed");
    expect(classifyMailSendError(undefined)).toBe("send-failed");
  });
});
