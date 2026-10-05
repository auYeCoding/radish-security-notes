import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import {
  exportFailed,
  type ExportFailureReason,
} from "@shared/export/export-result";
import { EXPORT_LOSS_REASONS } from "@shared/export/export-loss-reasons";
import { createI18nInstance } from "@shared/i18n/create-i18n-instance";

import { describeExportFailure } from "./describe-export-failure";
import {
  describeExportExclusion,
  describeExportLoss,
} from "./describe-export-loss";

/**
 * 全部失败原因.
 */
const ALL_REASONS: readonly ExportFailureReason[] = [
  "vault-locked",
  "unexpected-error",
  "invalid-input",
  "busy",
  "too-many-entries",
  "no-entries",
  "wrong-master-password",
  "invalid-passphrase",
  "plaintext-not-acknowledged",
  "write-failed",
  "attachment-missing",
  "no-finished-export",
  "reveal-failed",
];

/**
 * 创建指定界面语言的翻译函数.
 * @param language 界面语言.
 * @returns 翻译函数.
 */
async function createTranslate(language: "zh" | "en"): Promise<TFunction> {
  const instance = await createI18nInstance({
    language,
    isPseudoLocalizationEnabled: false,
  });
  return instance.t;
}

describe("导出失败的文案", () => {
  it("每种原因在中文与英文里都有文案, 不是键本身", async () => {
    for (const language of ["zh", "en"] as const) {
      const translate = await createTranslate(language);
      for (const reason of ALL_REASONS) {
        const message = describeExportFailure(exportFailed(reason), translate);
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain("export.failure");
      }
    }
  });

  it("超限的文案写出上限", async () => {
    const zh = await createTranslate("zh");
    expect(describeExportFailure(exportFailed("too-many-entries"), zh)).toBe(
      "一次最多导出 10000 条条目, 请缩小范围后分批导出.",
    );
  });
});

describe("带不出内容的文案", () => {
  it("每种原因的汇总文案带个数, 提示文案不带个数, 中英文都有", async () => {
    for (const language of ["zh", "en"] as const) {
      const translate = await createTranslate(language);
      for (const reason of EXPORT_LOSS_REASONS) {
        const loss = describeExportLoss({ reason, count: 7 }, translate);
        expect(loss).toContain("7");
        expect(loss).not.toContain("export.loss");
        const exclusion = describeExportExclusion(reason, translate);
        expect(exclusion.length).toBeGreaterThan(0);
        expect(exclusion).not.toContain("export.exclusion");
      }
    }
  });
});
