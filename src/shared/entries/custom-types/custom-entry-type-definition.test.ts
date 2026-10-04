import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "../../testing/custom-type-fixtures";
import { ENTRY_ACCOUNT_MAX_LENGTH } from "../common-entry-fields";
import { toEntryTypeDefinition } from "./custom-entry-type-definition";

describe("toEntryTypeDefinition", () => {
  it("带上类型键与类型名, 字段保持顺序并带字段名", () => {
    const definition = toEntryTypeDefinition(ROUTER_TYPE);

    expect(definition.key).toBe("custom:router");
    expect(definition.name).toBe("路由器");
    expect(definition.fields.map((field) => [field.key, field.name])).toEqual([
      ["account", "地址"],
      ["field-pass", "口令"],
      ["field-note", "说明"],
    ]);
  });

  it("保密与多行标记按字段转换", () => {
    const { fields } = toEntryTypeDefinition(ROUTER_TYPE);

    expect(fields.map((field) => field.isSensitive)).toEqual([
      false,
      true,
      false,
    ]);
    expect(fields.map((field) => field.isMultiline)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("只有摘要字段 (键为 account) 带账号长度上限", () => {
    const { fields } = toEntryTypeDefinition(ROUTER_TYPE);

    expect(fields.map((field) => field.maxLength)).toEqual([
      ENTRY_ACCOUNT_MAX_LENGTH,
      undefined,
      undefined,
    ]);
  });
});
