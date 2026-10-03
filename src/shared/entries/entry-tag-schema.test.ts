import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_ENTRY } from "../tags/tag-limits";
import { createEditEntrySchema } from "./edit-entry-schema";
import { toEntrySummary, type EntryDetail } from "./entry-types";
import {
  NEW_ENTRY_ERROR_CODES,
  createNewEntrySchema,
} from "./new-entry-schema";
import { LOGIN_TYPE } from "./preset-types/login-type";

/**
 * 一份通用登录的新建表单取值, 没有标签.
 */
const NEW_VALUES = {
  name: "n",
  fields: { account: "a", password: "p", url: "" },
  notes: "",
  customFields: [],
  totp: "",
};

/**
 * 生成指定个数的互不相同的标签编号.
 * @param count 个数.
 * @returns 标签编号数组.
 */
function tagIdsOf(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `tag-${index}`);
}

describe("条目校验方案里的标签", () => {
  it("新建校验方案: 省略, 空数组或给出编号都通过, 原样保留", () => {
    const schema = createNewEntrySchema(LOGIN_TYPE);

    const without = schema.safeParse(NEW_VALUES);
    const empty = schema.safeParse({ ...NEW_VALUES, tagIds: [] });
    const tagged = schema.safeParse({ ...NEW_VALUES, tagIds: ["t-1", "t-2"] });

    expect(without.success && without.data.tagIds).toBeUndefined();
    expect(empty.success && empty.data.tagIds).toEqual([]);
    expect(tagged.success && tagged.data.tagIds).toEqual(["t-1", "t-2"]);
  });

  it("新建校验方案: 恰好等于上限时通过, 超过时给出 tooManyTags", () => {
    const schema = createNewEntrySchema(LOGIN_TYPE);

    expect(
      schema.safeParse({
        ...NEW_VALUES,
        tagIds: tagIdsOf(MAX_TAGS_PER_ENTRY),
      }).success,
    ).toBe(true);
    const tooMany = schema.safeParse({
      ...NEW_VALUES,
      tagIds: tagIdsOf(MAX_TAGS_PER_ENTRY + 1),
    });
    expect(!tooMany.success && tooMany.error.issues[0]?.message).toBe(
      NEW_ENTRY_ERROR_CODES.tooManyTags,
    );
  });
});

describe("条目校验方案里的标签校验", () => {
  it("新建校验方案: 编号重复时给出 duplicateTags, 不是字符串数组时不通过", () => {
    const schema = createNewEntrySchema(LOGIN_TYPE);

    const duplicated = schema.safeParse({
      ...NEW_VALUES,
      tagIds: ["t-1", "t-1"],
    });
    expect(!duplicated.success && duplicated.error.issues[0]?.message).toBe(
      NEW_ENTRY_ERROR_CODES.duplicateTags,
    );
    for (const tagIds of ["t-1", [1], null, {}]) {
      expect(schema.safeParse({ ...NEW_VALUES, tagIds }).success).toBe(false);
    }
  });

  it("编辑校验方案: 与新建一致", () => {
    const schema = createEditEntrySchema(LOGIN_TYPE);
    const values = { ...NEW_VALUES, removeTotp: false };

    const tagged = schema.safeParse({ ...values, tagIds: ["t-1"] });

    expect(tagged.success && tagged.data.tagIds).toEqual(["t-1"]);
    expect(
      schema.safeParse({ ...values, tagIds: tagIdsOf(MAX_TAGS_PER_ENTRY + 1) })
        .success,
    ).toBe(false);
    expect(schema.safeParse({ ...values, tagIds: ["t", "t"] }).success).toBe(
      false,
    );
  });
});

describe("toEntrySummary 与标签", () => {
  it("摘要带上详情的标签编号, 没有标签时没有", () => {
    const detail: EntryDetail = {
      id: "e-1",
      name: "n",
      type: "login",
      account: "a",
      fields: { account: "a" },
      notes: "",
      customFields: [],
      hasTotp: false,
      tagIds: ["t-1", "t-2"],
    };

    expect(toEntrySummary(detail).tagIds).toEqual(["t-1", "t-2"]);
    expect(
      toEntrySummary({ ...detail, tagIds: undefined }).tagIds,
    ).toBeUndefined();
  });
});
