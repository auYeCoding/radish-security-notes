import { describe, expect, it } from "vitest";

import {
  EXPORT_SCOPE_CHOICES,
  INITIAL_EXPORT_DRAFT,
  findPassphraseProblem,
  isExportScopeChoice,
  toExportScope,
  willIncludeAttachments,
  type ExportDraft,
} from "./export-draft";

/**
 * 在初始填写内容上覆盖一部分.
 * @param overrides 要覆盖的部分.
 * @returns 填写内容.
 */
function draftOf(overrides: Partial<ExportDraft>): ExportDraft {
  return { ...INITIAL_EXPORT_DRAFT, ...overrides };
}

describe("导出填写内容的默认值", () => {
  it("本应用完整格式, 全部条目, 含保密字段与附件, 不加密", () => {
    expect(INITIAL_EXPORT_DRAFT).toEqual({
      format: "native",
      scopeChoice: "all",
      includeSecrets: true,
      includeAttachments: true,
      isEncrypted: false,
      passphrase: "",
      passphraseConfirmation: "",
    });
  });

  it("范围选项有三种, 只有登记过的值通过判断", () => {
    expect([...EXPORT_SCOPE_CHOICES]).toEqual(["all", "current", "checked"]);
    expect(isExportScopeChoice("current")).toBe(true);
    expect(isExportScopeChoice("folder")).toBe(false);
    expect(isExportScopeChoice(undefined)).toBe(false);
  });
});

describe("加密口令的问题", () => {
  it("没勾选加密时没有问题, 口令再短也不算", () => {
    expect(findPassphraseProblem(draftOf({ passphrase: "x" }))).toBeUndefined();
  });

  it("勾选加密后: 太短先报太短, 够长但两次不一致报不一致, 一致则没有问题", () => {
    const encrypted = draftOf({ isEncrypted: true });
    expect(findPassphraseProblem(encrypted)).toBe("too-short");
    expect(
      findPassphraseProblem({ ...encrypted, passphrase: "a".repeat(11) }),
    ).toBe("too-short");
    const long = { ...encrypted, passphrase: "a".repeat(12) };
    expect(findPassphraseProblem(long)).toBe("mismatch");
    expect(
      findPassphraseProblem({
        ...long,
        passphraseConfirmation: "a".repeat(12),
      }),
    ).toBeUndefined();
  });
});

describe("是否带附件", () => {
  it("只有能带附件的格式, 且用户没有关掉时才带", () => {
    expect(willIncludeAttachments(draftOf({}))).toBe(true);
    expect(willIncludeAttachments(draftOf({ includeAttachments: false }))).toBe(
      false,
    );
    expect(willIncludeAttachments(draftOf({ format: "bitwardenJson" }))).toBe(
      false,
    );
    expect(willIncludeAttachments(draftOf({ format: "browserCsv" }))).toBe(
      false,
    );
  });
});

describe("由范围选项算出送给主进程的范围", () => {
  it("全部范围不带编号, 当前列表与已勾选带各自的编号", () => {
    expect(toExportScope("all", ["a"], ["b"])).toEqual({ kind: "all" });
    expect(toExportScope("current", ["a"], ["b"])).toEqual({
      kind: "entries",
      entryIds: ["a"],
    });
    expect(toExportScope("checked", ["a"], ["b"])).toEqual({
      kind: "entries",
      entryIds: ["b"],
    });
  });
});
