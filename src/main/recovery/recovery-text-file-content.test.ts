import { describe, expect, it } from "vitest";

import { buildRecoveryTextFile } from "./recovery-text-file-content";
import type { RecoveryTextFileLabels } from "./recovery-text-file-labels";

/**
 * 测试用的文案.
 */
const LABELS: RecoveryTextFileLabels = {
  title: "标题",
  generated: "生成日期: 2026-10-02",
  usage: "用法说明",
  warning: "警示语",
  dialogTitle: "对话框",
  fileTypeName: "文本文件",
};

/**
 * 测试用的 24 个词.
 */
const WORDS = Array.from({ length: 24 }, (_value, index) => `word${index}`);

describe("buildRecoveryTextFile", () => {
  it("依次包含标题, 日期, 用法, 带序号的词与警示语", () => {
    const content = buildRecoveryTextFile({ words: WORDS, labels: LABELS });

    const lines = content.split("\n");
    expect(lines.slice(0, 4)).toEqual([
      "标题",
      "生成日期: 2026-10-02",
      "",
      "用法说明",
    ]);
    expect(lines.slice(5, 29)).toEqual(
      WORDS.map(
        (word, index) => `${String(index + 1).padStart(2, "0")}. ${word}`,
      ),
    );
    expect(lines.slice(30)).toEqual(["警示语", ""]);
  });

  it("词原样出现, 含占位符字符也不被改写", () => {
    const content = buildRecoveryTextFile({
      words: ["{date}", "$&"],
      labels: LABELS,
    });

    expect(content).toContain("01. {date}");
    expect(content).toContain("02. $&");
  });
});
