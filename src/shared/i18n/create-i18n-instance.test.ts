import { describe, expect, it } from "vitest";

import { createI18nInstance } from "./create-i18n-instance";

describe("createI18nInstance", () => {
  it("英文资源按 ICU 复数规则渲染", async () => {
    const instance = await createI18nInstance({
      language: "en",
      isPseudoLocalizationEnabled: false,
    });

    expect(instance.t("entryListPane.count", { count: 1 })).toBe("1 entry");
    expect(instance.t("entryListPane.count", { count: 3 })).toBe("3 entries");
  });

  it("切换语言后取到对应语言的文案", async () => {
    const instance = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    expect(instance.t("app.title")).toBe("安全笔记");
    await instance.changeLanguage("en");
    expect(instance.t("app.title")).toBe("Security Notes");
    expect(instance.t("entryListPane.count", { count: 2 })).toBe("2 entries");
  });

  it("两个实例互相独立", async () => {
    const first = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });
    const second = await createI18nInstance({
      language: "en",
      isPseudoLocalizationEnabled: false,
    });
    await first.changeLanguage("en");

    expect(second.language).toBe("en");
    expect(first).not.toBe(second);
  });

  it("启用伪本地化后文案被改写且仍含数字", async () => {
    const instance = await createI18nInstance({
      language: "en",
      isPseudoLocalizationEnabled: true,
    });

    const text = instance.t("entryListPane.count", { count: 3 });

    expect(text).not.toBe("3 entries");
    expect(text).toContain("3");
  });
});
