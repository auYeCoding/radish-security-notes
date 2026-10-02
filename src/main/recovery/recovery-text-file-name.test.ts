import { describe, expect, it } from "vitest";

import {
  RECOVERY_TEXT_FILE_EXTENSION,
  buildRecoveryTextFileName,
} from "./recovery-text-file-name";

describe("buildRecoveryTextFileName", () => {
  it("默认文件名带生成日期, 且只含 ASCII 字符", () => {
    const fileName = buildRecoveryTextFileName("2026-10-02");

    expect(fileName).toBe("radish-recovery-key-2026-10-02.txt");
    expect(/^[\x20-\x7e]+$/.test(fileName)).toBe(true);
  });

  it("扩展名是 txt", () => {
    expect(RECOVERY_TEXT_FILE_EXTENSION).toBe("txt");
  });
});
