import { describe, expect, it } from "vitest";

import { InvalidKeyRecordError, parseKeyRecord } from "./key-record";

/**
 * 一份合法的主密码保护记录.
 */
const MASTER_PASSWORD_RECORD = {
  version: 1,
  protection: "master-password",
  keyDerivation: {
    algorithm: "argon2id",
    memoryCostKibibytes: 1024,
    timeCost: 1,
    parallelism: 1,
    salt: "AAECAwQFBgcICQoLDA0ODw==",
  },
  wrappedDataKey: {
    nonce: "AAECAwQFBgcICQoL",
    ciphertext: "AAECAwQFBgcICQoLDA0ODw==",
    tag: "AAECAwQFBgcICQoLDA0ODw==",
  },
};

/**
 * 一份合法的系统保护记录.
 */
const SYSTEM_RECORD = {
  version: 1,
  protection: "system-protected",
  wrappedDataKey: "AAECAwQFBgcICQoLDA0ODw==",
};

describe("parseKeyRecord", () => {
  it("接受合法的主密码保护记录", () => {
    expect(parseKeyRecord(MASTER_PASSWORD_RECORD)).toEqual(
      MASTER_PASSWORD_RECORD,
    );
  });

  it("接受合法的系统保护记录", () => {
    expect(parseKeyRecord(SYSTEM_RECORD)).toEqual(SYSTEM_RECORD);
  });

  it("拒绝未知的保护方式", () => {
    expect(() =>
      parseKeyRecord({ ...SYSTEM_RECORD, protection: "plaintext" }),
    ).toThrow(InvalidKeyRecordError);
  });

  it("拒绝不支持的格式版本", () => {
    expect(() => parseKeyRecord({ ...SYSTEM_RECORD, version: 2 })).toThrow(
      InvalidKeyRecordError,
    );
  });

  it("拒绝缺少字段或字段类型不对的记录", () => {
    expect(() =>
      parseKeyRecord({ version: 1, protection: "system-protected" }),
    ).toThrow(InvalidKeyRecordError);
    expect(() =>
      parseKeyRecord({
        ...MASTER_PASSWORD_RECORD,
        keyDerivation: {
          ...MASTER_PASSWORD_RECORD.keyDerivation,
          timeCost: "1",
        },
      }),
    ).toThrow(InvalidKeyRecordError);
  });

  it("拒绝不是 base64 的数据", () => {
    expect(() =>
      parseKeyRecord({ ...SYSTEM_RECORD, wrappedDataKey: "not base64 !!" }),
    ).toThrow(InvalidKeyRecordError);
  });

  it("拒绝不是对象的值", () => {
    expect(() => parseKeyRecord("text")).toThrow(InvalidKeyRecordError);
    expect(() => parseKeyRecord(undefined)).toThrow(InvalidKeyRecordError);
  });
});
