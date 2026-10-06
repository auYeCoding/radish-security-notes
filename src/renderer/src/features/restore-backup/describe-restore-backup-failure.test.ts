import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import type {
  RestoreProblemCode,
  RestoreProblemSection,
} from "@shared/restore/restore-problem";
import {
  restoreFailed,
  type RestoreFailureReason,
} from "@shared/restore/restore-result";

import { describeRestoreBackupFailure } from "./describe-restore-backup-failure";

/**
 * 全部失败原因.
 */
const ALL_REASONS: readonly RestoreFailureReason[] = [
  "vault-locked",
  "unexpected-error",
  "invalid-input",
  "busy",
  "no-pending-restore",
  "file-unreadable",
  "file-too-large",
  "not-a-backup",
  "wrong-passphrase",
  "damaged-file",
  "newer-version",
  "invalid-content",
  "limit-exceeded",
  "wrong-master-password",
  "replace-not-acknowledged",
];

/**
 * 全部问题区段.
 */
const ALL_SECTIONS: readonly RestoreProblemSection[] = [
  "manifest",
  "archive",
  "folders",
  "tags",
  "customTypes",
  "entries",
  "attachments",
];

/**
 * 全部问题原因代码.
 */
const ALL_CODES: readonly RestoreProblemCode[] = [
  "wrong-shape",
  "duplicate-id",
  "duplicate-name",
  "invalid-value",
  "unknown-reference",
  "count-mismatch",
  "unexpected-file",
  "duplicate-file",
  "missing-file",
  "size-mismatch",
  "too-many-files",
  "too-large",
  "too-many-entries",
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

describe("恢复失败的文案", () => {
  it("每种原因在中文与英文里都有文案, 不是键本身", async () => {
    for (const language of ["zh", "en"] as const) {
      const translate = await createTranslate(language);
      for (const reason of ALL_REASONS) {
        const message = describeRestoreBackupFailure(
          restoreFailed(reason),
          translate,
        );
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain("restore.failure");
      }
    }
  });

  it("与具体问题无关的原因不写问题", async () => {
    const zh = await createTranslate("zh");
    expect(
      describeRestoreBackupFailure(restoreFailed("damaged-file"), zh),
    ).toBe("备份文件已损坏或不完整, 没有改动任何数据.");
  });
});

describe("恢复失败的问题说明", () => {
  it("内容不合规的文案写出问题的区段, 位置与原因", async () => {
    const zh = await createTranslate("zh");
    const failure = restoreFailed("invalid-content", {
      section: "entries",
      code: "duplicate-id",
      position: 3,
    });
    expect(describeRestoreBackupFailure(failure, zh)).toBe(
      "备份内容不合规, 已整体拒绝, 没有改动任何数据. 第一个问题: 条目, 第 3 项, 编号重复.",
    );
  });

  it("超过上限的文案在问题没有位置时不写位置", async () => {
    const zh = await createTranslate("zh");
    const failure = restoreFailed("limit-exceeded", {
      section: "archive",
      code: "too-many-files",
    });
    expect(describeRestoreBackupFailure(failure, zh)).toBe(
      "备份超过恢复上限, 已整体拒绝, 没有改动任何数据. 第一个问题: 压缩包, 文件个数过多.",
    );
  });
});

describe("恢复失败的英文文案与问题说明的完整性", () => {
  it("英文文案同样写出问题", async () => {
    const en = await createTranslate("en");
    const failure = restoreFailed("invalid-content", {
      section: "entries",
      code: "duplicate-id",
      position: 3,
    });
    expect(describeRestoreBackupFailure(failure, en)).toBe(
      "The backup content is not valid and was rejected as a whole. Nothing was changed. First problem: entries, item 3, duplicate id.",
    );
  });

  it("每个区段与原因代码在中文与英文里都有文案", async () => {
    for (const language of ["zh", "en"] as const) {
      const translate = await createTranslate(language);
      for (const section of ALL_SECTIONS) {
        for (const code of ALL_CODES) {
          const message = describeRestoreBackupFailure(
            restoreFailed("invalid-content", { section, code, position: 1 }),
            translate,
          );
          expect(message).not.toContain("restore.problem");
        }
      }
    }
  });
});
