import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";

import { formatByteSize } from "./format-byte-size";

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

describe("formatByteSize", () => {
  it("不到 1 KB 按字节显示整数", async () => {
    const translate = await createTranslate("zh");

    expect(formatByteSize(0, translate, "zh")).toBe("0 B");
    expect(formatByteSize(1, translate, "zh")).toBe("1 B");
    expect(formatByteSize(1023, translate, "en")).toBe("1,023 B");
  });

  it("按 1024 进制选单位, 单位以上最多保留一位小数", async () => {
    const translate = await createTranslate("zh");

    expect(formatByteSize(1024, translate, "zh")).toBe("1 KB");
    expect(formatByteSize(1536, translate, "zh")).toBe("1.5 KB");
    expect(formatByteSize(25 * 1024 * 1024, translate, "zh")).toBe("25 MB");
    expect(formatByteSize(100 * 1024 * 1024, translate, "zh")).toBe("100 MB");
    expect(formatByteSize(3 * 1024 ** 3, translate, "zh")).toBe("3 GB");
  });

  it("超过 GB 仍用 GB, 小数位随界面语言", async () => {
    const translate = await createTranslate("en");

    expect(formatByteSize(2048 * 1024 ** 3, translate, "en")).toBe("2,048 GB");
    expect(formatByteSize(1.25 * 1024 * 1024, translate, "en")).toBe("1.3 MB");
  });
});
