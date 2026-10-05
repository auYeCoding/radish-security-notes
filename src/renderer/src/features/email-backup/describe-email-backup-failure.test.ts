import type { i18n } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";

import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";
import { EMAIL_BACKUP_FAILURE_REASONS } from "@shared/email-backup/email-backup-result";
import { createI18nInstance } from "@shared/i18n/create-i18n-instance";

import { describeEmailBackupFailure } from "./describe-email-backup-failure";

describe.each(["zh", "en"] as const)("邮箱备份失败文案: %s", (language) => {
  let instance: i18n;
  beforeAll(async () => {
    instance = await createI18nInstance({
      language,
      isPseudoLocalizationEnabled: false,
    });
  });

  it("每个失败原因都有文案, 不是键本身, 没有留下占位符", () => {
    for (const reason of EMAIL_BACKUP_FAILURE_REASONS) {
      const text = describeEmailBackupFailure(reason, instance.t);
      expect(text).not.toBe("");
      expect(text).not.toContain("emailBackup.failure");
      expect(text).not.toMatch(/[{}]/);
    }
  });

  it("条目过多的文案写出上限, 认证失败的文案提示重填授权码", () => {
    expect(
      describeEmailBackupFailure("too-many-entries", instance.t),
    ).toContain(String(MAX_TRANSFER_ENTRIES));
    const authentication = describeEmailBackupFailure(
      "authentication-failed",
      instance.t,
    );
    expect(authentication).toMatch(
      language === "zh" ? /授权码/ : /authorization code/,
    );
  });
});
