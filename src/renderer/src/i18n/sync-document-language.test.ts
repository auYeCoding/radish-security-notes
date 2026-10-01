import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { describe, expect, it } from "vitest";

import { syncDocumentLanguage } from "./sync-document-language";

describe("syncDocumentLanguage", () => {
  it("立即按当前语言设置 lang 与 dir", async () => {
    const root = document.createElement("html");
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    syncDocumentLanguage(root, i18n);

    expect(root.lang).toBe("zh-Hans");
    expect(root.dir).toBe("ltr");
  });

  it("切换语言时更新 lang", async () => {
    const root = document.createElement("html");
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });
    syncDocumentLanguage(root, i18n);

    await i18n.changeLanguage("en");
    expect(root.lang).toBe("en");
    await i18n.changeLanguage("zh");
    expect(root.lang).toBe("zh-Hans");
  });

  it("取消同步后不再响应切换", async () => {
    const root = document.createElement("html");
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });
    const stop = syncDocumentLanguage(root, i18n);

    stop();
    await i18n.changeLanguage("en");

    expect(root.lang).toBe("zh-Hans");
  });
});
