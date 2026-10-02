import { describe, expect, it } from "vitest";

import { requireMasterPassword, requireRecoveryWords } from "./ipc-arguments";

describe("requireMasterPassword", () => {
  it("字符串原样通过, 其它类型被拒绝", () => {
    expect(requireMasterPassword("abc")).toBe("abc");
    expect(() => requireMasterPassword(12345678)).toThrow("无效的主密码");
    expect(() => requireMasterPassword(undefined)).toThrow("无效的主密码");
  });
});

describe("requireRecoveryWords", () => {
  it("字符串数组通过, 包括空串与不在词表的词", () => {
    expect(requireRecoveryWords(["abandon", "", "notaword"])).toEqual([
      "abandon",
      "",
      "notaword",
    ]);
  });

  it("返回的是副本", () => {
    const original = ["abandon"];

    expect(requireRecoveryWords(original)).not.toBe(original);
  });

  it("不是数组或含非字符串元素时被拒绝", () => {
    expect(() => requireRecoveryWords("abandon")).toThrow("无效的恢复词");
    expect(() => requireRecoveryWords(undefined)).toThrow("无效的恢复词");
    expect(() => requireRecoveryWords(["abandon", 1])).toThrow("无效的恢复词");
  });

  it("数组过长或单个词过长时被拒绝", () => {
    expect(() => requireRecoveryWords(Array(65).fill("a"))).toThrow(
      "无效的恢复词",
    );
    expect(() => requireRecoveryWords(["a".repeat(65)])).toThrow(
      "无效的恢复词",
    );
  });
});
