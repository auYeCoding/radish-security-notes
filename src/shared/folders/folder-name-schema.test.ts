import { describe, expect, it } from "vitest";

import { isSameFolderName } from "./folder-name-match";
import {
  FOLDER_NAME_ERROR_CODES,
  FOLDER_NAME_MAX_LENGTH,
  createFolderNameSchema,
} from "./folder-name-schema";

describe("createFolderNameSchema", () => {
  it("名称去首尾空格后通过", () => {
    const result = createFolderNameSchema().safeParse({ name: "  工作  " });

    expect(result.success && result.data).toEqual({ name: "工作" });
  });

  it("名称为空或只有空白时给出 nameRequired", () => {
    for (const name of ["", "   ", "\t\n"]) {
      const result = createFolderNameSchema().safeParse({ name });

      expect(!result.success && result.error.issues[0]?.message).toBe(
        FOLDER_NAME_ERROR_CODES.nameRequired,
      );
    }
  });

  it("恰好等于上限时通过, 按字符而不是按 UTF-16 单元计数, 超过时给出 nameTooLong", () => {
    const schema = createFolderNameSchema();

    expect(
      schema.safeParse({ name: "a".repeat(FOLDER_NAME_MAX_LENGTH) }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ name: "😀".repeat(FOLDER_NAME_MAX_LENGTH) }).success,
    ).toBe(true);
    const tooLong = schema.safeParse({
      name: "a".repeat(FOLDER_NAME_MAX_LENGTH + 1),
    });
    expect(!tooLong.success && tooLong.error.issues[0]?.message).toBe(
      FOLDER_NAME_ERROR_CODES.nameTooLong,
    );
  });

  it("名称缺失或不是字符串时不通过", () => {
    const schema = createFolderNameSchema();

    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ name: 1 }).success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });
});

describe("isSameFolderName", () => {
  it("去首尾空格后忽略英文大小写, 相同即同名", () => {
    expect(isSameFolderName("Work", "work")).toBe(true);
    expect(isSameFolderName("  Work ", "WORK")).toBe(true);
    expect(isSameFolderName("工作", " 工作 ")).toBe(true);
  });

  it("英文字母大小写混用, 夹在数字与符号之间时也相同即同名", () => {
    expect(isSameFolderName("wOrK-2", "WoRk-2")).toBe(true);
    expect(isSameFolderName("A1_b", "a1_B")).toBe(true);
  });

  it("非英文字母的大小写不同时不算同名", () => {
    expect(isSameFolderName("École", "école")).toBe(false);
    expect(isSameFolderName("Дом", "дом")).toBe(false);
    expect(isSameFolderName("Σ", "σ")).toBe(false);
    expect(isSameFolderName("Ａ", "ａ")).toBe(false);
  });

  it("非英文字母相同, 只有英文字母的大小写不同时仍算同名", () => {
    expect(isSameFolderName("École Work", "École WORK")).toBe(true);
  });

  it("名称不同, 或中间空格不同时不算同名", () => {
    expect(isSameFolderName("Work", "Works")).toBe(false);
    expect(isSameFolderName("my work", "mywork")).toBe(false);
    expect(isSameFolderName("工作", "家庭")).toBe(false);
  });
});
