import { describe, expect, it } from "vitest";

import { DEFAULT_TAG_COLOR, TAG_COLOR_KEYS, isTagColorKey } from "./tag-colors";
import { isSameTagName } from "./tag-name-match";
import {
  TAG_NAME_ERROR_CODES,
  TAG_NAME_MAX_LENGTH,
  createTagFormSchema,
} from "./tag-name-schema";

describe("createTagFormSchema", () => {
  it("名称去首尾空格后通过, 颜色原样保留", () => {
    const result = createTagFormSchema().safeParse({
      name: "  工作  ",
      color: "red",
    });

    expect(result.success && result.data).toEqual({
      name: "工作",
      color: "red",
    });
  });

  it("名称为空或只有空白时给出 nameRequired", () => {
    for (const name of ["", "   ", "\t\n"]) {
      const result = createTagFormSchema().safeParse({
        name,
        color: DEFAULT_TAG_COLOR,
      });

      expect(!result.success && result.error.issues[0]?.message).toBe(
        TAG_NAME_ERROR_CODES.nameRequired,
      );
    }
  });
});

describe("createTagFormSchema 的长度与颜色", () => {
  it("恰好等于上限时通过, 按字符而不是按 UTF-16 单元计数, 超过时给出 nameTooLong", () => {
    const schema = createTagFormSchema();

    expect(
      schema.safeParse({
        name: "a".repeat(TAG_NAME_MAX_LENGTH),
        color: DEFAULT_TAG_COLOR,
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        name: "😀".repeat(TAG_NAME_MAX_LENGTH),
        color: DEFAULT_TAG_COLOR,
      }).success,
    ).toBe(true);
    const tooLong = schema.safeParse({
      name: "a".repeat(TAG_NAME_MAX_LENGTH + 1),
      color: DEFAULT_TAG_COLOR,
    });
    expect(!tooLong.success && tooLong.error.issues[0]?.message).toBe(
      TAG_NAME_ERROR_CODES.nameTooLong,
    );
  });

  it("颜色不在调色板里, 或缺失时不通过", () => {
    const schema = createTagFormSchema();

    expect(schema.safeParse({ name: "工作", color: "teal" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ name: "工作" }).success).toBe(false);
  });

  it("名称缺失或不是字符串时不通过", () => {
    const schema = createTagFormSchema();

    expect(schema.safeParse({ color: "red" }).success).toBe(false);
    expect(schema.safeParse({ name: 1, color: "red" }).success).toBe(false);
  });
});

describe("调色板", () => {
  it("有 8 种颜色, 默认色是第一种", () => {
    expect(TAG_COLOR_KEYS).toHaveLength(8);
    expect(DEFAULT_TAG_COLOR).toBe(TAG_COLOR_KEYS[0]);
  });

  it("isTagColorKey 只认调色板里的键", () => {
    for (const key of TAG_COLOR_KEYS) {
      expect(isTagColorKey(key)).toBe(true);
    }
    expect(isTagColorKey("teal")).toBe(false);
    expect(isTagColorKey(undefined)).toBe(false);
    expect(isTagColorKey(1)).toBe(false);
  });
});

describe("isSameTagName", () => {
  it("去首尾空格后忽略英文大小写, 相同即同名", () => {
    expect(isSameTagName("Work", " work ")).toBe(true);
    expect(isSameTagName("工作", " 工作 ")).toBe(true);
  });

  it("非英文字母的大小写不同, 或名称不同时不算同名", () => {
    expect(isSameTagName("École", "école")).toBe(false);
    expect(isSameTagName("工作", "家庭")).toBe(false);
  });
});
