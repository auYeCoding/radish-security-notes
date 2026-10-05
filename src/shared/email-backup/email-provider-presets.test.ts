import { describe, expect, it } from "vitest";

import {
  EMAIL_PROVIDER_KEYS,
  EMAIL_PROVIDER_PRESETS,
  isEmailConnectionSecurity,
  isEmailProviderKey,
} from "./email-provider-presets";

describe("邮箱类型预置表: 官方页面核实的值", () => {
  it("QQ 与 163 邮箱", () => {
    expect(EMAIL_PROVIDER_PRESETS.qq).toMatchObject({
      host: "smtp.qq.com",
      port: 465,
      security: "ssl",
      sizeLimitMebibytes: 50,
    });
    expect(EMAIL_PROVIDER_PRESETS.netease163).toMatchObject({
      host: "smtp.163.com",
      port: 465,
      security: "ssl",
      sizeLimitMebibytes: 15,
    });
  });

  it("Gmail 与 Outlook", () => {
    expect(EMAIL_PROVIDER_PRESETS.gmail).toMatchObject({
      host: "smtp.gmail.com",
      port: 465,
      security: "ssl",
      sizeLimitMebibytes: 25,
    });
    expect(EMAIL_PROVIDER_PRESETS.outlook).toMatchObject({
      host: "smtp-mail.outlook.com",
      port: 587,
      security: "starttls",
      sizeLimitMebibytes: 25,
    });
  });
});

describe("邮箱类型预置表: 结构", () => {
  it("每种登记的类型都有预置, 键与登记表一致", () => {
    for (const key of EMAIL_PROVIDER_KEYS) {
      expect(EMAIL_PROVIDER_PRESETS[key].key).toBe(key);
    }
  });

  it("只有 Outlook 暂不支持, 自定义的服务器由用户填写", () => {
    const unsupported = EMAIL_PROVIDER_KEYS.filter(
      (key) => !EMAIL_PROVIDER_PRESETS[key].isSupported,
    );
    expect(unsupported).toEqual(["outlook"]);
    expect(EMAIL_PROVIDER_PRESETS.custom.host).toBe("");
  });

  it("没有任何预置使用明文连接", () => {
    for (const key of EMAIL_PROVIDER_KEYS) {
      expect(
        isEmailConnectionSecurity(EMAIL_PROVIDER_PRESETS[key].security),
      ).toBe(true);
    }
    expect(isEmailConnectionSecurity("none")).toBe(false);
  });

  it("判断是否登记过的邮箱类型", () => {
    expect(isEmailProviderKey("qq")).toBe(true);
    expect(isEmailProviderKey("yahoo")).toBe(false);
    expect(isEmailProviderKey(undefined)).toBe(false);
  });
});
