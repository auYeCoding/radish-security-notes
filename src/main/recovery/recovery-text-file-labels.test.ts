import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { describe, expect, it } from "vitest";

import { readRecoveryTextFileLabels } from "./recovery-text-file-labels";

describe("readRecoveryTextFileLabels", () => {
  it("中文界面取中文文案并带上生成日期", async () => {
    const translator = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    const labels = readRecoveryTextFileLabels(translator, "2026-10-02");

    expect(labels.title).toBe("恢复密钥");
    expect(labels.generated).toBe("生成日期: 2026-10-02");
    expect(labels.warning).toContain("万能钥匙");
    expect(labels.fileTypeName).toBe("文本文件");
  });

  it("英文界面取英文文案", async () => {
    const translator = await createI18nInstance({
      language: "en",
      isPseudoLocalizationEnabled: false,
    });

    const labels = readRecoveryTextFileLabels(translator, "2026-10-02");

    expect(labels.title).toBe("Recovery key");
    expect(labels.generated).toBe("Generated: 2026-10-02");
    expect(labels.warning).toContain("master key");
  });

  it("切换语言后下一次读取立即生效", async () => {
    const translator = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    await translator.changeLanguage("en");

    expect(readRecoveryTextFileLabels(translator, "2026-10-02").title).toBe(
      "Recovery key",
    );
  });
});
