import { describe, expect, it } from "vitest";

import { BANK_CARD_TYPE } from "@shared/entries/preset-types/bank-card-type";

import { findCopyValue, normalizeFieldValues } from "./entry-field-values";
import type { EntryRecord } from "./entry-repository";

/**
 * 测试用的银行卡条目行, 只存了卡号与取款密码.
 */
const BANK_CARD_RECORD: EntryRecord = {
  id: "card-1",
  name: "工资卡",
  type: "bankCard",
  fields: { cardNumber: "6222", cardPin: "9999", legacyKey: "dropped" },
  notes: "备注\n第二行",
  customFields: [],
  totp: null,
  folderId: null,
  createdAt: 1,
};

describe("normalizeFieldValues", () => {
  it("类型的每个字段都有一项, 没存过的取空串, 类型之外的键被丢弃", () => {
    const result = normalizeFieldValues(
      BANK_CARD_TYPE,
      BANK_CARD_RECORD.fields,
    );

    expect(result).toEqual({
      cardholder: "",
      bankName: "",
      cardNumber: "6222",
      expiry: "",
      securityCode: "",
      cardPin: "9999",
    });
    expect(Object.keys(result)).toEqual(
      BANK_CARD_TYPE.fields.map((field) => field.key),
    );
  });
});

describe("findCopyValue", () => {
  it("取类型字段的值, 存过的原样, 没存过的是空串", () => {
    expect(findCopyValue(BANK_CARD_RECORD, "cardNumber")).toBe("6222");
    expect(findCopyValue(BANK_CARD_RECORD, "expiry")).toBe("");
  });

  it("取备注的值", () => {
    expect(findCopyValue(BANK_CARD_RECORD, "notes")).toBe("备注\n第二行");
  });

  it("字段名不属于条目类型时为 undefined, 存着但不属于类型的键也取不到", () => {
    expect(findCopyValue(BANK_CARD_RECORD, "account")).toBeUndefined();
    expect(findCopyValue(BANK_CARD_RECORD, "legacyKey")).toBeUndefined();
    expect(findCopyValue(BANK_CARD_RECORD, "customFields")).toBeUndefined();
  });
});
