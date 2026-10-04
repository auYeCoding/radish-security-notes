import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { describe, expect, it } from "vitest";

import type { BatchFailureReason } from "@shared/batch/batch-result";

import { describeBatchFailure } from "./describe-batch-failure";

/**
 * 每种失败原因在中文下期望的文案.
 */
const EXPECTED_MESSAGES: readonly (readonly [BatchFailureReason, string])[] = [
  ["not-found", "有条目已不存在, 操作没有执行."],
  ["folder-not-found", "目标文件夹已不存在, 操作没有执行."],
  ["tag-not-found", "这个标签已不存在, 操作没有执行."],
  ["tag-limit-exceeded", "有条目已带满 10 个标签, 操作没有执行."],
  ["invalid-input", "没有选中任何条目, 操作没有执行."],
  [
    "unexpected-error",
    "操作失败, 没有任何改动. 请重试, 仍失败请关闭应用后重试.",
  ],
  ["vault-locked", "操作失败, 没有任何改动. 请重试, 仍失败请关闭应用后重试."],
];

describe("describeBatchFailure", () => {
  it("每种失败原因给出说明操作没有执行的中文文案", async () => {
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    const messages = EXPECTED_MESSAGES.map(([reason]) =>
      describeBatchFailure(reason, i18n.t),
    );

    expect(messages).toEqual(EXPECTED_MESSAGES.map(([, message]) => message));
  });

  it("英文文案同样说明没有任何改动", async () => {
    const i18n = await createI18nInstance({
      language: "en",
      isPseudoLocalizationEnabled: false,
    });

    expect(describeBatchFailure("tag-limit-exceeded", i18n.t)).toBe(
      "Some entries already have 10 tags. Nothing was changed.",
    );
    expect(describeBatchFailure("not-found", i18n.t)).toBe(
      "Some entries no longer exist. Nothing was changed.",
    );
  });
});
