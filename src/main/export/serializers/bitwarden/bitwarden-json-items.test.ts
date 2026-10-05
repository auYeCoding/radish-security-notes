import { describe, expect, it } from "vitest";

import { exportSampleAsBitwarden } from "../../../testing/bitwarden-export-fixture";
import { ED25519_PUBLIC_KEY_SAMPLE } from "../../../testing/ssh-public-key-samples";
import { useVaultDatabase } from "../../../testing/use-vault-database";

describe("Bitwarden JSON: 身份与安全笔记", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-identity");

  it("身份: 全名整体进名, 地址整体进地址第一行, 证件号码写成隐藏自定义字段", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[3];
    expect(item?.type).toBe(4);
    expect(item?.identity).toMatchObject({
      firstName: "李 四",
      lastName: null,
      email: "li@example.com",
      phone: "13800000000",
      address1: "北京市\n朝阳区",
      passportNumber: null,
      ssn: null,
    });
    expect(item?.fields).toEqual([
      {
        name: "label:documentNumber",
        value: "110101199001011234",
        type: 1,
        linkedId: null,
      },
    ]);
  });

  it("安全笔记: 正文进备注, 条目备注空一行接在后面, 没有自定义字段时不写 fields", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[4];
    expect(item?.type).toBe(2);
    expect(item?.secureNote).toEqual({ type: 0 });
    expect(item?.notes).toBe("正文第一行\n正文第二行\n\n附加备注");
    expect(item && "fields" in item).toBe(false);
  });
});

describe("Bitwarden JSON: SSH 密钥", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-ssh");

  it("私钥与公钥对应写入, 指纹由公钥算出, 其余字段写成自定义字段", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[5];
    expect(item?.type).toBe(5);
    expect(item?.sshKey).toEqual({
      privateKey: "-----BEGIN KEY-----\nabc\n-----END KEY-----",
      publicKey: ED25519_PUBLIC_KEY_SAMPLE.line,
      keyFingerprint: ED25519_PUBLIC_KEY_SAMPLE.fingerprint,
    });
    expect(item?.fields?.map((field) => [field.name, field.type])).toEqual([
      ["label:host", 0],
      ["label:port", 0],
      ["label:account", 0],
      ["label:keyPassphrase", 1],
    ]);
  });
});

describe("Bitwarden JSON: 并入登录的类型", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-merged");

  it("自定义类型: 摘要字段进用户名, 字段名取类型自己的名称, 保密字段隐藏", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[6];
    expect(item?.type).toBe(1);
    expect(item?.login).toMatchObject({
      username: "192.168.1.1",
      password: null,
    });
    expect(item?.fields).toEqual([
      { name: "口令", value: "router-secret", type: 1, linkedId: null },
      { name: "说明", value: "机房左侧\n第二行", type: 0, linkedId: null },
    ]);
  });

  it("WiFi: 全部类型字段写成自定义字段, 保密的隐藏", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[7];
    expect(item?.type).toBe(1);
    expect(item?.fields?.map((field) => [field.name, field.type])).toEqual([
      ["label:networkName", 0],
      ["label:networkPassword", 1],
      ["label:securityKind", 0],
    ]);
  });
});
