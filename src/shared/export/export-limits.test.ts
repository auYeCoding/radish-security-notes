import { describe, expect, it } from "vitest";

import { MAX_TRANSFER_ENTRIES } from "../data-transfer/transfer-limits";
import {
  EXPORT_PASSPHRASE_MIN_LENGTH,
  EXPORT_SECRET_MAX_LENGTH,
  isExportPassphraseLongEnough,
  isExportPassphraseValid,
  MAX_EXPORT_SCOPE_IDS,
} from "./export-limits";

describe("导出的限制", () => {
  it("范围编号的边界上限不小于条目上限", () => {
    expect(MAX_EXPORT_SCOPE_IDS).toBeGreaterThanOrEqual(MAX_TRANSFER_ENTRIES);
  });

  it("口令至少 12 个字符", () => {
    expect(EXPORT_PASSPHRASE_MIN_LENGTH).toBe(12);
    expect(isExportPassphraseLongEnough("a".repeat(11))).toBe(false);
    expect(isExportPassphraseLongEnough("a".repeat(12))).toBe(true);
  });

  it("口令长度按码点计数, 12 个汉字与 12 个表情都够长", () => {
    expect(isExportPassphraseLongEnough("口令".repeat(6))).toBe(true);
    expect(isExportPassphraseLongEnough("😀".repeat(12))).toBe(true);
    expect(isExportPassphraseLongEnough("😀".repeat(11))).toBe(false);
  });

  it("口令超过进程边界上限时不合规", () => {
    expect(isExportPassphraseValid("a".repeat(EXPORT_SECRET_MAX_LENGTH))).toBe(
      true,
    );
    expect(
      isExportPassphraseValid("a".repeat(EXPORT_SECRET_MAX_LENGTH + 1)),
    ).toBe(false);
    expect(isExportPassphraseValid("short")).toBe(false);
  });
});
