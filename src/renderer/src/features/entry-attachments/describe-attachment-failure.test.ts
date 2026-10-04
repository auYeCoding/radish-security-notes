import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import {
  attachmentFailed,
  type AttachmentFailureReason,
} from "@shared/attachments/attachment-result";
import { createI18nInstance } from "@shared/i18n/create-i18n-instance";

import { describeAttachmentFailure } from "./describe-attachment-failure";

/**
 * 全部失败原因.
 */
const ALL_REASONS: readonly AttachmentFailureReason[] = [
  "vault-locked",
  "unexpected-error",
  "invalid-input",
  "not-found",
  "empty-file",
  "file-too-large",
  "too-many-attachments",
  "total-too-large",
  "not-a-file",
  "read-failed",
  "write-failed",
  "not-openable",
  "not-previewable",
  "open-failed",
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

describe("describeAttachmentFailure 文案", () => {
  it("与文件有关的失败带文件名, 大小上限与个数上限写进文案", async () => {
    const translate = await createTranslate("zh");
    const describeFailure = (
      reason: AttachmentFailureReason,
      fileName?: string,
    ): string =>
      describeAttachmentFailure(
        attachmentFailed(reason, fileName),
        translate,
        "zh",
      );

    expect(describeFailure("empty-file", "空.txt")).toBe(
      '"空.txt" 是空文件, 没有添加任何附件.',
    );
    expect(describeFailure("file-too-large", "大.bin")).toBe(
      '"大.bin" 超过单个附件 25 MB 的上限, 没有添加任何附件.',
    );
    expect(describeFailure("too-many-attachments")).toBe(
      "一个条目最多 20 个附件, 没有添加任何附件.",
    );
    expect(describeFailure("total-too-large")).toBe(
      "一个条目的附件加起来最多 100 MB, 没有添加任何附件.",
    );
  });

  it("未解锁与意外错误共用同一条文案", async () => {
    const translate = await createTranslate("zh");

    expect(
      describeAttachmentFailure(
        attachmentFailed("vault-locked"),
        translate,
        "zh",
      ),
    ).toBe(
      describeAttachmentFailure(
        attachmentFailed("unexpected-error"),
        translate,
        "zh",
      ),
    );
  });
});

describe("describeAttachmentFailure 覆盖全部原因", () => {
  it.each(["zh", "en"] as const)("%s: 每种原因都有文案", async (language) => {
    const translate = await createTranslate(language);

    ALL_REASONS.forEach((reason) => {
      const message = describeAttachmentFailure(
        attachmentFailed(reason, "名.txt"),
        translate,
        language,
      );
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toContain("entryAttachments");
    });
  });
});
