import { describe, expect, it } from "vitest";

import {
  CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH,
  CUSTOM_ENTRY_TYPE_MAX_FIELDS,
  CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH,
} from "./custom-entry-type-limits";
import {
  createCustomEntryTypeSchema,
  CUSTOM_ENTRY_TYPE_ERROR_CODES,
  type CustomEntryTypeFieldFormValues,
  type CustomEntryTypeFormValues,
} from "./custom-entry-type-schema";

/**
 * 构造一个合法字段, 可以覆盖其中的取值.
 * @param overrides 要覆盖的取值.
 * @returns 字段取值.
 */
function fieldOf(
  overrides: Partial<CustomEntryTypeFieldFormValues> = {},
): CustomEntryTypeFieldFormValues {
  return {
    name: "字段",
    kind: "singleLine",
    isSensitive: false,
    isSummary: false,
    ...overrides,
  };
}

/**
 * 构造一个合法类型, 可以覆盖其中的取值.
 * @param overrides 要覆盖的取值.
 * @returns 类型取值.
 */
function typeOf(
  overrides: Partial<CustomEntryTypeFormValues> = {},
): CustomEntryTypeFormValues {
  return { name: "路由器", fields: [fieldOf()], ...overrides };
}

/**
 * 校验一个类型取值, 取第一条错误的错误代码.
 * @param values 类型取值.
 * @returns 错误代码, 校验通过时为 undefined.
 */
function firstErrorOf(values: unknown): string | undefined {
  return createCustomEntryTypeSchema().safeParse(values).error?.issues[0]
    ?.message;
}

/**
 * 构造 `count` 个字段名互不相同的字段.
 * @param count 字段个数.
 * @returns 字段取值列表.
 */
function distinctFields(count: number): CustomEntryTypeFieldFormValues[] {
  return Array.from({ length: count }, (_, index) =>
    fieldOf({ name: `字段${index}` }),
  );
}

describe("createCustomEntryTypeSchema 合法输入", () => {
  it("名称与字段名去首尾空格, 其余取值原样保留", () => {
    const result = createCustomEntryTypeSchema().safeParse(
      typeOf({
        name: "  路由器  ",
        fields: [
          fieldOf({ name: " 地址 ", isSummary: true }),
          fieldOf({ name: "说明", kind: "multiLine" }),
        ],
      }),
    );

    expect(result.data).toEqual({
      name: "路由器",
      fields: [
        {
          name: "地址",
          kind: "singleLine",
          isSensitive: false,
          isSummary: true,
        },
        {
          name: "说明",
          kind: "multiLine",
          isSensitive: false,
          isSummary: false,
        },
      ],
    });
  });
});

describe("createCustomEntryTypeSchema 字段键与保密多行字段", () => {
  it("字段键可以省略, 给出时原样保留, 不是字符串时不通过", () => {
    const schema = createCustomEntryTypeSchema();
    const keyed = schema.safeParse(
      typeOf({ fields: [fieldOf({ key: "field-a" })] }),
    );

    expect(keyed.data?.fields[0]?.key).toBe("field-a");
    expect(
      schema.safeParse({
        name: "类型",
        fields: [{ ...fieldOf(), key: 1 }],
      }).success,
    ).toBe(false);
  });

  it("保密的多行字段合法", () => {
    expect(
      createCustomEntryTypeSchema().safeParse(
        typeOf({
          fields: [fieldOf({ kind: "multiLine", isSensitive: true })],
        }),
      ).success,
    ).toBe(true);
  });
});

describe("createCustomEntryTypeSchema 上限刚好通过", () => {
  it("名称刚好是上限时通过", () => {
    expect(
      createCustomEntryTypeSchema().safeParse(
        typeOf({ name: "类".repeat(CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH) }),
      ).success,
    ).toBe(true);
  });

  it("字段名与字段个数刚好是上限时通过", () => {
    const fields = distinctFields(CUSTOM_ENTRY_TYPE_MAX_FIELDS);
    fields[0] = fieldOf({
      name: "字".repeat(CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH),
    });

    expect(
      createCustomEntryTypeSchema().safeParse(typeOf({ fields })).success,
    ).toBe(true);
  });
});

describe("createCustomEntryTypeSchema 类型名称", () => {
  it("空名称与只有空格的名称给出名称必填的错误代码", () => {
    expect(firstErrorOf(typeOf({ name: "" }))).toBe(
      CUSTOM_ENTRY_TYPE_ERROR_CODES.nameRequired,
    );
    expect(firstErrorOf(typeOf({ name: "   " }))).toBe(
      CUSTOM_ENTRY_TYPE_ERROR_CODES.nameRequired,
    );
  });

  it("名称超过上限给出名称过长的错误代码", () => {
    expect(
      firstErrorOf(
        typeOf({ name: "类".repeat(CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH + 1) }),
      ),
    ).toBe(CUSTOM_ENTRY_TYPE_ERROR_CODES.nameTooLong);
  });

  it("缺少属性或类型不对时不通过", () => {
    expect(firstErrorOf({ name: "类型" })).toBeDefined();
    expect(firstErrorOf({ name: 1, fields: [] })).toBeDefined();
    expect(
      firstErrorOf({ name: "类型", fields: [{ name: "字段" }] }),
    ).toBeDefined();
  });
});

describe("createCustomEntryTypeSchema 字段列表", () => {
  it("没有字段给出需要字段的错误代码", () => {
    expect(firstErrorOf(typeOf({ fields: [] }))).toBe(
      CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldsRequired,
    );
  });

  it("字段个数超过上限给出字段过多的错误代码", () => {
    expect(
      firstErrorOf(
        typeOf({ fields: distinctFields(CUSTOM_ENTRY_TYPE_MAX_FIELDS + 1) }),
      ),
    ).toBe(CUSTOM_ENTRY_TYPE_ERROR_CODES.tooManyFields);
  });

  it("字段名重复 (忽略首尾空格与英文大小写) 时指向后出现的字段", () => {
    const result = createCustomEntryTypeSchema().safeParse(
      typeOf({
        fields: [fieldOf({ name: "Host" }), fieldOf({ name: " host " })],
      }),
    );

    expect(result.error?.issues[0]).toMatchObject({
      message: CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameDuplicate,
      path: ["fields", 1, "name"],
    });
  });
});

describe("createCustomEntryTypeSchema 字段内容", () => {
  it("字段名为空与只有空格都给出字段名必填的错误代码, 并指向该字段", () => {
    const result = createCustomEntryTypeSchema().safeParse(
      typeOf({ fields: [fieldOf(), fieldOf({ name: "  " })] }),
    );

    expect(result.error?.issues[0]).toMatchObject({
      message: CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameRequired,
      path: ["fields", 1, "name"],
    });
  });

  it("字段名超过上限给出字段名过长的错误代码", () => {
    const name = "字".repeat(CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH + 1);

    expect(firstErrorOf(typeOf({ fields: [fieldOf({ name })] }))).toBe(
      CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameTooLong,
    );
  });

  it("未知的取值形态给出未知形态的错误代码", () => {
    const unknownKind = { ...fieldOf(), kind: "date" };

    expect(firstErrorOf({ name: "类型", fields: [unknownKind] })).toBe(
      CUSTOM_ENTRY_TYPE_ERROR_CODES.unknownKind,
    );
  });
});

describe("createCustomEntryTypeSchema 摘要字段", () => {
  it("没有摘要字段与恰好一个非保密单行摘要字段都合法", () => {
    const schema = createCustomEntryTypeSchema();

    expect(schema.safeParse(typeOf()).success).toBe(true);
    expect(
      schema.safeParse(typeOf({ fields: [fieldOf({ isSummary: true })] }))
        .success,
    ).toBe(true);
  });

  it("两个摘要字段时第二个被指出", () => {
    const result = createCustomEntryTypeSchema().safeParse(
      typeOf({
        fields: [
          fieldOf({ name: "甲", isSummary: true }),
          fieldOf({ name: "乙", isSummary: true }),
        ],
      }),
    );

    expect(result.error?.issues[0]).toMatchObject({
      message: CUSTOM_ENTRY_TYPE_ERROR_CODES.summaryInvalid,
      path: ["fields", 1, "isSummary"],
    });
  });

  it("保密字段或多行字段不能作摘要", () => {
    const sensitive = fieldOf({ isSummary: true, isSensitive: true });
    const multiLine = fieldOf({ isSummary: true, kind: "multiLine" });

    expect(firstErrorOf(typeOf({ fields: [sensitive] }))).toBe(
      CUSTOM_ENTRY_TYPE_ERROR_CODES.summaryInvalid,
    );
    expect(firstErrorOf(typeOf({ fields: [multiLine] }))).toBe(
      CUSTOM_ENTRY_TYPE_ERROR_CODES.summaryInvalid,
    );
  });
});
