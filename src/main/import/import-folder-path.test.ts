import { describe, expect, it } from "vitest";

import { FOLDER_NAME_MAX_LENGTH } from "@shared/folders/folder-name-schema";
import { countCharacters } from "@shared/text/character-count";

import { normalizeFolderPath } from "./import-folder-path";

describe("规整来源的文件夹路径: 层级", () => {
  it("空串与只有分隔符的路径没有文件夹", () => {
    expect(normalizeFolderPath("")).toEqual({
      name: undefined,
      isTruncated: false,
    });
    expect(normalizeFolderPath(" / // ")).toEqual({
      name: undefined,
      isTruncated: false,
    });
  });

  it("单层名称原样保留, 去首尾空格", () => {
    expect(normalizeFolderPath("  工作 ")).toEqual({
      name: "工作",
      isTruncated: false,
    });
  });

  it("多层路径用完整路径作名称, 每层去空格并丢掉空层", () => {
    expect(normalizeFolderPath(" 工作 / 项目 //2026 ")).toEqual({
      name: "工作/项目/2026",
      isTruncated: false,
    });
  });
});

describe("规整来源的文件夹路径: 超长", () => {
  it("恰好等于字符上限的路径不截断", () => {
    const path = "a".repeat(FOLDER_NAME_MAX_LENGTH);
    expect(normalizeFolderPath(path)).toEqual({
      name: path,
      isTruncated: false,
    });
  });

  it("超过字符上限时从最内层往外取尾部", () => {
    const outer = "外".repeat(30);
    const inner = "内".repeat(20);
    const result = normalizeFolderPath(`${outer}/${inner}`);
    expect(result.isTruncated).toBe(true);
    expect(result.name).toBe(`${"外".repeat(29)}/${inner}`);
    expect(countCharacters(result.name ?? "")).toBeLessThanOrEqual(
      FOLDER_NAME_MAX_LENGTH,
    );
  });

  it("截断按码点计数, 不会把表情拆成半个", () => {
    const result = normalizeFolderPath(`${"😀".repeat(60)}/末`);
    expect(result.isTruncated).toBe(true);
    expect(result.name?.endsWith("/末")).toBe(true);
    expect(result.name).not.toContain("�");
    expect(countCharacters(result.name ?? "")).toBeLessThanOrEqual(
      FOLDER_NAME_MAX_LENGTH,
    );
  });
});
