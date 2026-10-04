import { describe, expect, it } from "vitest";

import { isEntryTypeKey } from "../preset-entry-types";
import {
  CUSTOM_SUMMARY_FIELD_KEY,
  customTypeIdOf,
  isCustomFieldKey,
  isCustomTypeKey,
  toCustomFieldKey,
  toCustomTypeKey,
} from "./custom-entry-type-key";

describe("自定义类型键", () => {
  it("类型键带 custom: 前缀, 能还原出类型编号", () => {
    const key = toCustomTypeKey("abc-123");

    expect(key).toBe("custom:abc-123");
    expect(isCustomTypeKey(key)).toBe(true);
    expect(customTypeIdOf(key)).toBe("abc-123");
  });

  it("预设类型键与空编号都不是自定义类型键", () => {
    expect(isCustomTypeKey("login")).toBe(false);
    expect(isCustomTypeKey("custom")).toBe(false);
    expect(isCustomTypeKey("custom:")).toBe(false);
    expect(customTypeIdOf("login")).toBeUndefined();
  });

  it("自定义类型键不会被当成预设类型键", () => {
    expect(isEntryTypeKey(toCustomTypeKey("login"))).toBe(false);
  });
});

describe("自定义字段键", () => {
  it("非摘要字段的键带 field- 前缀", () => {
    const key = toCustomFieldKey("f1");

    expect(key).toBe("field-f1");
    expect(isCustomFieldKey(key)).toBe(true);
  });

  it("预设字段键, 摘要字段键与空编号都不是自定义字段键", () => {
    expect(isCustomFieldKey("password")).toBe(false);
    expect(isCustomFieldKey("field-")).toBe(false);
    expect(isCustomFieldKey(CUSTOM_SUMMARY_FIELD_KEY)).toBe(false);
  });

  it("摘要字段的键是 account, 与预设账号字段一致", () => {
    expect(CUSTOM_SUMMARY_FIELD_KEY).toBe("account");
  });
});
