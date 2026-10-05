import { describe, expect, it } from "vitest";

import en from "../locales/en.json";
import zh from "../locales/zh.json";
import { IMPORT_SOURCE_KEYS } from "./import-source-keys";

/**
 * 一种导入来源在界面里的文案, 缺哪一项就没有哪一项.
 */
interface SourceMessages {
  /**
   * 来源的名称.
   */
  readonly label?: string;
  /**
   * 来源的说明.
   */
  readonly hint?: string;
}

/**
 * 来源键到界面文案的对照表.
 */
type SourceMessageTable = Readonly<Record<string, SourceMessages | undefined>>;

/**
 * 每种来源都必须有的文案项.
 */
const REQUIRED_MESSAGE_FIELDS = ["label", "hint"] as const;

/**
 * 找出对照表里缺少或为空的来源文案.
 * @param table 来源键到文案的对照表.
 * @param keys 必须有文案的来源键.
 * @returns 形如 "来源键.文案项" 的缺项, 文案齐全时为空数组.
 */
function findMissingSourceMessages(
  table: SourceMessageTable,
  keys: readonly string[],
): string[] {
  return keys.flatMap((key) =>
    REQUIRED_MESSAGE_FIELDS.filter(
      (field) => (table[key]?.[field] ?? "").trim() === "",
    ).map((field) => `${key}.${field}`),
  );
}

describe("导入来源的界面文案", () => {
  it("中文对每个来源键都有名称与说明", () => {
    expect(
      findMissingSourceMessages(zh.import.source.options, IMPORT_SOURCE_KEYS),
    ).toEqual([]);
  });

  it("英文对每个来源键都有名称与说明", () => {
    expect(
      findMissingSourceMessages(en.import.source.options, IMPORT_SOURCE_KEYS),
    ).toEqual([]);
  });

  it("缺少或为空的文案会被检出", () => {
    const incomplete: SourceMessageTable = {
      bitwardenJson: { label: "名称", hint: "说明" },
      bitwardenCsv: { label: "名称" },
      browserCsv: { label: "名称", hint: "  " },
    };
    const keys = [
      "bitwardenJson",
      "bitwardenCsv",
      "browserCsv",
      "keepassxcCsv",
    ];
    expect(findMissingSourceMessages(incomplete, keys)).toEqual([
      "bitwardenCsv.hint",
      "browserCsv.hint",
      "keepassxcCsv.label",
      "keepassxcCsv.hint",
    ]);
  });
});
