import { describe, expect, it } from "vitest";

import {
  DEFAULT_EMAIL_BACKUP_SETTINGS,
  resolveRecipientAddress,
  type EmailBackupSettings,
} from "./email-backup-settings";
import {
  findEmailBackupSettingsProblems,
  isEmailAddressValid,
} from "./email-backup-settings-rules";

/**
 * 一份合规的设置.
 */
const VALID: EmailBackupSettings = {
  ...DEFAULT_EMAIL_BACKUP_SETTINGS,
  senderAddress: "alice@qq.com",
};

describe("邮箱地址格式", () => {
  it("合规的地址", () => {
    expect(isEmailAddressValid("alice@qq.com")).toBe(true);
    expect(isEmailAddressValid("a.b+c@mail.example.co.uk")).toBe(true);
  });

  it("没有 @, 没有域名点, 含空白, 过长都不合规", () => {
    for (const bad of ["", "alice", "alice@qq", "a b@qq.com", "@qq.com"]) {
      expect(isEmailAddressValid(bad)).toBe(false);
    }
    expect(isEmailAddressValid(`${"a".repeat(250)}@b.cd`)).toBe(false);
  });
});

describe("设置字段的问题", () => {
  it("合规的设置没有问题", () => {
    expect(findEmailBackupSettingsProblems(VALID)).toEqual([]);
  });

  it("发件邮箱必填且格式合规, 收件邮箱可以不填", () => {
    expect(
      findEmailBackupSettingsProblems({ ...VALID, senderAddress: "" }),
    ).toEqual([{ field: "senderAddress", kind: "required" }]);
    expect(
      findEmailBackupSettingsProblems({ ...VALID, senderAddress: "x" }),
    ).toEqual([{ field: "senderAddress", kind: "invalid" }]);
    expect(
      findEmailBackupSettingsProblems({ ...VALID, recipientAddress: "bad" }),
    ).toEqual([{ field: "recipientAddress", kind: "invalid" }]);
  });
});

describe("设置字段的问题: 自定义服务器", () => {
  const custom = {
    ...VALID,
    provider: "custom" as const,
    host: "mail.example.com",
  };

  it("服务器地址必填且格式合规", () => {
    expect(findEmailBackupSettingsProblems({ ...custom, host: "" })).toEqual([
      { field: "host", kind: "required" },
    ]);
    expect(
      findEmailBackupSettingsProblems({ ...custom, host: "-bad.example" }),
    ).toEqual([{ field: "host", kind: "invalid" }]);
  });

  it("端口必须在 1 至 65535 的范围内", () => {
    for (const port of [0, 65536]) {
      expect(findEmailBackupSettingsProblems({ ...custom, port })).toEqual([
        { field: "port", kind: "out-of-range" },
      ]);
    }
    expect(findEmailBackupSettingsProblems({ ...custom, port: 587 })).toEqual(
      [],
    );
  });

  it("预置类型不检查服务器地址与端口", () => {
    expect(
      findEmailBackupSettingsProblems({ ...VALID, host: "", port: 0 }),
    ).toEqual([]);
  });
});

describe("设置字段的问题: 单封上限", () => {
  it("单封上限必须是 1 至 1024 的整数", () => {
    for (const bad of [0, -1, 1025, 1.5, Number.NaN]) {
      expect(
        findEmailBackupSettingsProblems({ ...VALID, sizeLimitMebibytes: bad }),
      ).toEqual([{ field: "sizeLimitMebibytes", kind: "out-of-range" }]);
    }
    for (const good of [1, 50, 1024]) {
      expect(
        findEmailBackupSettingsProblems({ ...VALID, sizeLimitMebibytes: good }),
      ).toEqual([]);
    }
  });
});

describe("收件邮箱", () => {
  it("没另填时是发件邮箱, 另填了就用另填的", () => {
    expect(resolveRecipientAddress(VALID)).toBe("alice@qq.com");
    expect(
      resolveRecipientAddress({ ...VALID, recipientAddress: "bob@x.com" }),
    ).toBe("bob@x.com");
  });
});
