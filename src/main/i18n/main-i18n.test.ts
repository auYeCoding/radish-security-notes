import { describe, expect, it } from "vitest";

import { createMainI18n, isPseudoLocalizationEnabled } from "./main-i18n";

describe("isPseudoLocalizationEnabled", () => {
  it("开发环境且环境变量为 1 时启用", () => {
    expect(isPseudoLocalizationEnabled(true, "1")).toBe(true);
  });

  it("生产环境永远不启用", () => {
    expect(isPseudoLocalizationEnabled(false, "1")).toBe(false);
  });

  it("环境变量缺失或不是 1 时不启用", () => {
    expect(isPseudoLocalizationEnabled(true, undefined)).toBe(false);
    expect(isPseudoLocalizationEnabled(true, "0")).toBe(false);
  });
});

describe("createMainI18n", () => {
  it("按初始语言取到窗口标题", async () => {
    const zh = await createMainI18n("zh", false);
    const en = await createMainI18n("en", false);

    expect(zh.t("app.title")).toBe("安全笔记");
    expect(en.t("app.title")).toBe("Security Notes");
  });
});
