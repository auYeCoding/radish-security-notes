import { describe, expect, it } from "vitest";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import { buildEntryRecord } from "./entry-record-builder";

/**
 * 通用登录的新建取值, 没有 TOTP.
 */
const LOGIN_VALUES: NewEntryFormValues = {
  name: "论坛",
  fields: { account: "a", password: "p", url: "" },
  notes: "备注",
  customFields: [
    { label: "一", value: "1", isHidden: false },
    { label: "二", value: "2", isHidden: true },
  ],
  totp: "",
};

/**
 * 用通用登录类型与给定取值生成条目行.
 * @param values 校验后的新建取值.
 * @returns 条目行.
 */
function buildLoginRecord(
  values: NewEntryFormValues,
): ReturnType<typeof buildEntryRecord> {
  let counter = 0;
  return buildEntryRecord({
    type: LOGIN_TYPE,
    values,
    createIdentifier: () => `id-${(counter += 1)}`,
    createdAt: 42,
  });
}

describe("buildEntryRecord", () => {
  it("先取条目编号, 再依次给自定义字段取编号, 记下类型与创建时间", () => {
    expect(buildLoginRecord(LOGIN_VALUES)).toEqual({
      id: "id-1",
      name: "论坛",
      type: "login",
      fields: { account: "a", password: "p", url: "" },
      notes: "备注",
      customFields: [
        { id: "id-2", label: "一", value: "1", isHidden: false },
        { id: "id-3", label: "二", value: "2", isHidden: true },
      ],
      totp: null,
      createdAt: 42,
    });
  });
});

describe("buildEntryRecord 的 TOTP", () => {
  it("TOTP 输入为空或只有空白时不带 TOTP", () => {
    expect(buildLoginRecord({ ...LOGIN_VALUES, totp: "" }).totp).toBeNull();
    expect(buildLoginRecord({ ...LOGIN_VALUES, totp: " \n " }).totp).toBeNull();
  });

  it("Base32 密钥存成规范化的大写密钥与默认的算法, 位数, 周期", () => {
    const record = buildLoginRecord({
      ...LOGIN_VALUES,
      totp: "jbsw y3dp ehpk 3pxp",
    });

    expect(record.totp).toEqual({
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA1",
      digits: 6,
      periodSeconds: 30,
    });
  });

  it("otpauth 链接存成链接里的算法, 位数与周期", () => {
    const record = buildLoginRecord({
      ...LOGIN_VALUES,
      totp: "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&algorithm=SHA256&digits=8&period=60",
    });

    expect(record.totp).toEqual({
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA256",
      digits: 8,
      periodSeconds: 60,
    });
  });

  it("没有经过校验的 TOTP 输入会抛出错误", () => {
    expect(() =>
      buildLoginRecord({ ...LOGIN_VALUES, totp: "not base32!" }),
    ).toThrow(Error);
  });
});
