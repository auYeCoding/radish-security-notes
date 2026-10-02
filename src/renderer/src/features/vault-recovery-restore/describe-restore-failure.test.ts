import { describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";

import { describeRestoreFailure } from "./describe-restore-failure";

describe("describeRestoreFailure", () => {
  it("没有失败时没有文案", async () => {
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    expect(
      describeRestoreFailure(undefined, undefined, i18n.t),
    ).toBeUndefined();
  });

  it("词不在词表时指出第几个词", async () => {
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    expect(describeRestoreFailure("recovery-unknown-word", 7, i18n.t)).toBe(
      "第 7 个词不在词表中, 请检查拼写.",
    );
  });

  it("其它失败原因各有文案, 不认识的原因按意外失败处理", async () => {
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });
    const describe = (
      reason: Parameters<typeof describeRestoreFailure>[0],
    ): string | undefined => describeRestoreFailure(reason, undefined, i18n.t);

    expect(describe("recovery-word-count")).toBe("需要填满 24 个词.");
    expect(describe("recovery-checksum")).toBe(
      "词的拼写或顺序有误, 请逐个核对.",
    );
    expect(describe("recovery-key-rejected")).toContain("不匹配");
    expect(describe("system-protection-unavailable")).toContain("系统");
    expect(describe("password-too-short")).toBe("主密码至少需要 8 个字符.");
    expect(describe("unexpected-error")).toBe("恢复失败. 请关闭应用后重试.");
  });

  it("英文界面取英文文案", async () => {
    const i18n = await createI18nInstance({
      language: "en",
      isPseudoLocalizationEnabled: false,
    });

    expect(describeRestoreFailure("recovery-unknown-word", 3, i18n.t)).toBe(
      "Word 3 is not in the word list. Check the spelling.",
    );
  });
});
