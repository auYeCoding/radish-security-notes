import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import {
  NOT_IMPORTED_REASONS,
  type NotImportedScope,
} from "@shared/import/import-reasons";

import { describeNotImportedItem } from "./describe-not-imported-item";

/**
 * 全部清单项类别.
 */
const SCOPES: readonly NotImportedScope[] = ["entry", "folder", "row"];

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

describe("未能带入内容的文案", () => {
  it("每种原因与类别在中文与英文里都有文案", async () => {
    for (const language of ["zh", "en"] as const) {
      const translate = await createTranslate(language);
      for (const reason of NOT_IMPORTED_REASONS) {
        for (const scope of SCOPES) {
          const described = describeNotImportedItem(
            { scope, name: "名称", reason },
            translate,
          );
          expect(described.heading).not.toContain("import.");
          expect(described.detail).not.toContain("import.");
        }
      }
    }
  });

  it("标题是类别加名称, 有字段名时说明里带字段名", async () => {
    const zh = await createTranslate("zh");

    expect(
      describeNotImportedItem(
        {
          scope: "entry",
          name: "甲",
          fieldName: "TOTP",
          reason: "totp-invalid",
        },
        zh,
      ),
    ).toEqual({
      heading: "条目 甲",
      detail: "字段 TOTP: TOTP 无法解析, 已丢弃, 其余内容照常导入",
    });
    expect(
      describeNotImportedItem(
        { scope: "row", name: "7", reason: "row-malformed" },
        zh,
      ),
    ).toEqual({
      heading: "文件行 7",
      detail: "这一行的列数与表头不一致, 没有导入",
    });
  });
});
