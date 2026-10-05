import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import {
  importFailed,
  type ImportFailureReason,
} from "@shared/import/import-result";

import { describeImportFailure } from "./describe-import-failure";

/**
 * 全部失败原因.
 */
const ALL_REASONS: readonly ImportFailureReason[] = [
  "vault-locked",
  "unexpected-error",
  "invalid-input",
  "busy",
  "no-pending-import",
  "file-unreadable",
  "file-empty",
  "file-too-large",
  "encoding-unsupported",
  "format-mismatch",
  "encrypted-file",
  "organization-export-unsupported",
  "malformed-file",
  "too-many-entries",
  "no-importable-entries",
  "save-failed",
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

describe("导入失败的文案", () => {
  it("每种原因在中文与英文里都有文案, 不是键本身", async () => {
    for (const language of ["zh", "en"] as const) {
      const translate = await createTranslate(language);
      for (const reason of ALL_REASONS) {
        const message = describeImportFailure(importFailed(reason), translate);
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain("import.failure");
      }
    }
  });

  it("超限的文案写出上限, 格式错误带行号时写出行号", async () => {
    const zh = await createTranslate("zh");
    const en = await createTranslate("en");

    expect(describeImportFailure(importFailed("file-too-large"), zh)).toBe(
      "文件超过 20 MiB, 无法导入.",
    );
    expect(describeImportFailure(importFailed("too-many-entries"), en)).toBe(
      "The file has more than 10000 entries and cannot be imported.",
    );
    expect(describeImportFailure(importFailed("malformed-file", 7), zh)).toBe(
      "文件格式有误, 无法解析 (第 7 行附近).",
    );
  });
});
