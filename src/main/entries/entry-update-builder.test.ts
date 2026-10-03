import { describe, expect, it } from "vitest";

import type { EditEntryFormValues } from "@shared/entries/edit-entry-schema";
import type { TotpConfig } from "@shared/entries/totp-config";

import { buildUpdatedRecord } from "./entry-update-builder";
import type { EntryRecord } from "./entry-repository";

/**
 * 条目原来带的 TOTP 配置, 算法, 位数与周期都不是默认值.
 */
const EXISTING_TOTP: TotpConfig = {
  secret: "JBSWY3DPEHPK3PXP",
  algorithm: "SHA256",
  digits: 8,
  periodSeconds: 60,
};

/**
 * 已保存的条目行.
 */
const EXISTING_RECORD: EntryRecord = {
  id: "entry-1",
  name: "旧名称",
  type: "login",
  fields: { account: "old", password: "old-p", url: "" },
  notes: "旧备注",
  customFields: [{ id: "old-field", label: "旧", value: "v", isHidden: true }],
  totp: EXISTING_TOTP,
  createdAt: 42,
};

/**
 * 构造经校验的编辑取值.
 * @param overrides 要覆盖的字段.
 * @returns 编辑取值.
 */
function valuesOf(
  overrides: Partial<EditEntryFormValues> = {},
): EditEntryFormValues {
  return {
    name: "新名称",
    fields: { account: "new", password: "new-p", url: "https://a.test" },
    notes: "新备注",
    customFields: [{ label: "新", value: "n", isHidden: false }],
    totp: "",
    removeTotp: false,
    ...overrides,
  };
}

/**
 * 依次返回 new-1, new-2 的编号生成函数.
 * @returns 编号生成函数.
 */
function createCounter(): () => string {
  let count = 0;
  return () => `new-${(count += 1)}`;
}

/**
 * 用编号依次为 new-1, new-2 的生成函数, 由已保存的行与取值生成更新后的行.
 * @param values 经校验的编辑取值.
 * @param existing 已保存的行, 默认是带 TOTP 的条目行.
 * @returns 更新后的行.
 */
function buildWith(
  values: EditEntryFormValues,
  existing: EntryRecord = EXISTING_RECORD,
): EntryRecord {
  return buildUpdatedRecord({
    existing,
    values,
    createIdentifier: createCounter(),
  });
}

describe("buildUpdatedRecord 内容", () => {
  it("编号, 类型与创建时间保持不变, 内容换成新取值, 自定义字段重新分配编号", () => {
    const record = buildWith(valuesOf());

    expect(record).toEqual({
      id: "entry-1",
      name: "新名称",
      type: "login",
      fields: { account: "new", password: "new-p", url: "https://a.test" },
      notes: "新备注",
      customFields: [{ id: "new-1", label: "新", value: "n", isHidden: false }],
      totp: EXISTING_TOTP,
      createdAt: 42,
    });
  });

  it("不修改传入的原行", () => {
    const snapshot = structuredClone(EXISTING_RECORD);

    buildWith(valuesOf({ removeTotp: true }));

    expect(EXISTING_RECORD).toEqual(snapshot);
  });
});

describe("buildUpdatedRecord TOTP", () => {
  it("TOTP 输入为空或只有空白时保持原配置", () => {
    for (const totp of ["", "   "]) {
      expect(buildWith(valuesOf({ totp })).totp).toEqual(EXISTING_TOTP);
    }
  });

  it("TOTP 输入是新密钥时, 换成用默认算法, 位数与周期解析出的配置", () => {
    const record = buildWith(valuesOf({ totp: "gezd gnbv gy3t qojq" }));

    expect(record.totp).toEqual({
      secret: "GEZDGNBVGY3TQOJQ",
      algorithm: "SHA1",
      digits: 6,
      periodSeconds: 30,
    });
  });

  it("要求移除时 TOTP 为 null, 优先于输入内容", () => {
    const record = buildWith(
      valuesOf({ removeTotp: true, totp: "JBSWY3DPEHPK3PXP" }),
    );

    expect(record.totp).toBeNull();
  });

  it("本来不带 TOTP 的条目, 输入为空时仍为 null", () => {
    const record = buildWith(valuesOf(), { ...EXISTING_RECORD, totp: null });

    expect(record.totp).toBeNull();
  });
});
