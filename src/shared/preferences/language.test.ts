import { describe, expect, it } from "vitest";

import {
  LANGUAGE_TAGS,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  resolveLanguageFromLocale,
} from "./language";

describe("LANGUAGE_TAGS", () => {
  it("每种界面语言都有标签, 简体中文带 Hans 文字标注", () => {
    expect(Object.keys(LANGUAGE_TAGS).sort()).toEqual(
      [...SUPPORTED_LANGUAGES].sort(),
    );
    expect(LANGUAGE_TAGS.zh).toBe("zh-Hans");
    expect(LANGUAGE_TAGS.en).toBe("en");
  });
});

describe("resolveLanguageFromLocale", () => {
  it.each(["zh-CN", "zh-TW", "zh", "ZH-hans"])(
    "系统语言 %s 取中文",
    (locale) => {
      expect(resolveLanguageFromLocale(locale)).toBe("zh");
    },
  );

  it.each(["en-US", "en", "fr-FR", "ja", ""])(
    "系统语言 %s 取英文",
    (locale) => {
      expect(resolveLanguageFromLocale(locale)).toBe("en");
    },
  );
});

describe("isSupportedLanguage", () => {
  it("只接受 zh 与 en", () => {
    expect(isSupportedLanguage("zh")).toBe(true);
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("pseudo")).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });
});
