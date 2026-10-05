import { describe, expect, it } from "vitest";

import { exportSampleAsBitwarden } from "../../../testing/bitwarden-export-fixture";
import {
  SAMPLE_ENTRY_IDS,
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_TOTP_SECRET,
} from "../../../testing/export-sample-data";
import { useVaultDatabase } from "../../../testing/use-vault-database";

describe("Bitwarden JSON: 顶层结构", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-top");

  it("未加密的个人库: encrypted 为 false, 文件夹与条目", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    expect(document.encrypted).toBe(false);
    expect(document.folders).toEqual([
      { id: "folder-work", name: "工作" },
      { id: "folder-home", name: "Home" },
      { id: "folder-unused", name: "没人用" },
    ]);
    expect(document.items).toHaveLength(8);
  });
});

describe("Bitwarden JSON: 登录", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-login");

  it("账号, 密码, 网址, 默认参数的 TOTP 写 Base32 密钥, 自定义字段保留隐藏属性", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[0];
    expect(item).toMatchObject({
      id: SAMPLE_ENTRY_IDS.login,
      type: 1,
      name: "示例登录, 含逗号",
      notes: "备注, 含逗号\n第二行",
      folderId: "folder-work",
      reprompt: 0,
      favorite: false,
      organizationId: null,
      collectionIds: null,
    });
    expect(item?.login).toEqual({
      uris: [{ match: null, uri: "https://example.com/login" }],
      username: "alice@example.com",
      password: SAMPLE_LOGIN_PASSWORD,
      totp: SAMPLE_TOTP_SECRET,
    });
    expect(item?.fields).toEqual([
      { name: "密保问题", value: "答案", type: 0, linkedId: null },
      { name: "PIN", value: "9527", type: 1, linkedId: null },
    ]);
  });
});

describe("Bitwarden JSON: 论坛", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-forum");

  it("并入登录: 非默认参数的 TOTP 写 otpauth 链接, 邮箱写成自定义字段", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[1];
    const totp = String(item?.login?.["totp"]);
    expect(item?.type).toBe(1);
    expect(totp.startsWith("otpauth://totp/")).toBe(true);
    for (const part of [
      `secret=${SAMPLE_TOTP_SECRET}`,
      "algorithm=SHA256",
      "digits=8",
      "period=60",
    ]) {
      expect(totp).toContain(part);
    }
    expect(item?.fields).toEqual([
      {
        name: "label:email",
        value: "bob@example.org",
        type: 0,
        linkedId: null,
      },
    ]);
    expect(item?.notes).toBe("# 标题\n\n- 一\n- 二");
  });
});

describe("Bitwarden JSON: 银行卡", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-card");

  it("对应写入卡属性, 有效期解析成月与年, 银行名称与 PIN 写成自定义字段", async () => {
    const { document } = await exportSampleAsBitwarden(getDatabase().orm);
    const item = document.items[2];
    expect(item?.type).toBe(3);
    expect(item?.card).toEqual({
      cardholderName: "张三",
      brand: null,
      number: "6225880123456789",
      expMonth: "8",
      expYear: "2029",
      code: "123",
    });
    expect(item?.fields).toEqual([
      { name: "label:bankName", value: "招商银行", type: 0, linkedId: null },
      { name: "label:cardPin", value: "4321", type: 1, linkedId: null },
    ]);
    expect(item?.folderId).toBe("folder-home");
  });
});
