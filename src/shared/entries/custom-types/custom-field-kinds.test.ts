import { describe, expect, it } from "vitest";

import {
  CUSTOM_FIELD_KINDS,
  DEFAULT_CUSTOM_FIELD_KIND,
  isCustomFieldKind,
  isMultiLineKind,
} from "./custom-field-kinds";

describe("自定义字段的取值形态", () => {
  it("只有单行文本与多行文本两种, 默认单行", () => {
    expect(CUSTOM_FIELD_KINDS).toEqual(["singleLine", "multiLine"]);
    expect(DEFAULT_CUSTOM_FIELD_KIND).toBe("singleLine");
  });

  it("认得清单里的形态, 不认得其它值", () => {
    expect(isCustomFieldKind("multiLine")).toBe(true);
    expect(isCustomFieldKind("date")).toBe(false);
    expect(isCustomFieldKind(undefined)).toBe(false);
  });

  it("只有多行文本被判为多行", () => {
    expect(isMultiLineKind("multiLine")).toBe(true);
    expect(isMultiLineKind("singleLine")).toBe(false);
  });
});
