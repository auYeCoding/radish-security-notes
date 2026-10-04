import { describe, expect, it } from "vitest";

import { toEntryTypeDefinition } from "@shared/entries/custom-types/custom-entry-type-definition";
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
  notesFormat: "plain",
  customFields: [],
  totp: null,
  folderId: null,
  createdAt: 1,
};

/**
 * 测试用的自定义类型定义: 摘要字段 account 与保密字段 field-a.
 */
const ROUTER_TYPE = toEntryTypeDefinition({
  id: "t1",
  key: "custom:t1",
  name: "路由器",
  fields: [
    { key: "account", name: "地址", kind: "singleLine", isSensitive: false },
    { key: "field-a", name: "口令", kind: "singleLine", isSensitive: true },
  ],
});

/**
 * 测试用的自定义类型条目行, 多存了一个类型之外的键.
 */
const ROUTER_RECORD: EntryRecord = {
  ...BANK_CARD_RECORD,
  id: "router-1",
  type: "custom:t1",
  fields: { account: "192.168.1.1", "field-a": "s3cret", "field-gone": "x" },
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

  it("自定义类型同样按它的字段补全与丢弃", () => {
    expect(
      normalizeFieldValues(ROUTER_TYPE, { account: "a", "field-gone": "x" }),
    ).toEqual({ account: "a", "field-a": "" });
  });
});

describe("findCopyValue", () => {
  it("取类型字段的值, 存过的原样, 没存过的是空串", () => {
    expect(findCopyValue(BANK_CARD_RECORD, BANK_CARD_TYPE, "cardNumber")).toBe(
      "6222",
    );
    expect(findCopyValue(BANK_CARD_RECORD, BANK_CARD_TYPE, "expiry")).toBe("");
  });

  it("取备注的值", () => {
    expect(findCopyValue(BANK_CARD_RECORD, BANK_CARD_TYPE, "notes")).toBe(
      "备注\n第二行",
    );
  });

  it("字段名不属于条目类型时为 undefined, 存着但不属于类型的键也取不到", () => {
    expect(
      findCopyValue(BANK_CARD_RECORD, BANK_CARD_TYPE, "account"),
    ).toBeUndefined();
    expect(
      findCopyValue(BANK_CARD_RECORD, BANK_CARD_TYPE, "legacyKey"),
    ).toBeUndefined();
    expect(
      findCopyValue(BANK_CARD_RECORD, BANK_CARD_TYPE, "customFields"),
    ).toBeUndefined();
  });

  it("自定义类型的字段与保密字段都能取到, 类型之外的键取不到", () => {
    expect(findCopyValue(ROUTER_RECORD, ROUTER_TYPE, "account")).toBe(
      "192.168.1.1",
    );
    expect(findCopyValue(ROUTER_RECORD, ROUTER_TYPE, "field-a")).toBe("s3cret");
    expect(
      findCopyValue(ROUTER_RECORD, ROUTER_TYPE, "field-gone"),
    ).toBeUndefined();
  });

  it("找不到类型时只能复制备注", () => {
    expect(findCopyValue(ROUTER_RECORD, undefined, "notes")).toBe(
      "备注\n第二行",
    );
    expect(findCopyValue(ROUTER_RECORD, undefined, "account")).toBeUndefined();
  });
});
