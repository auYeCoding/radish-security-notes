import { describe, expect, it } from "vitest";

import {
  bitwardenCard,
  bitwardenExport,
  bitwardenIdentity,
  bitwardenLogin,
  bitwardenNote,
  bitwardenSshKey,
} from "../../testing/bitwarden-sample";
import { parseOutput, parseSample } from "../../testing/import-draft-fixture";
import { bitwardenJsonAdapter } from "./bitwarden-json-adapter";

describe("Bitwarden JSON: 文件级检查", () => {
  it("非法 JSON 与顶层不是对象报文件损坏", async () => {
    expect(await parseSample(bitwardenJsonAdapter, "{oops")).toEqual({
      ok: false,
      reason: "malformed-file",
    });
    expect(await parseSample(bitwardenJsonAdapter, "[1,2]")).toEqual({
      ok: false,
      reason: "malformed-file",
    });
  });

  it("加密导出, 组织库导出, 不是 Bitwarden 的 JSON 各报对应原因", async () => {
    const encrypted = JSON.stringify({ encrypted: true, data: "x" });
    const organization = JSON.stringify({
      encrypted: false,
      collections: [],
      items: [],
    });
    const unrelated = JSON.stringify({ hello: "world" });
    expect(await parseSample(bitwardenJsonAdapter, encrypted)).toEqual({
      ok: false,
      reason: "encrypted-file",
    });
    expect(await parseSample(bitwardenJsonAdapter, organization)).toEqual({
      ok: false,
      reason: "organization-export-unsupported",
    });
    expect(await parseSample(bitwardenJsonAdapter, unrelated)).toEqual({
      ok: false,
      reason: "format-mismatch",
    });
  });

  it("条目不是对象时记为没能解析的行, 其余条目照常解析", async () => {
    const output = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([bitwardenNote(), "oops", 3]),
    );
    expect(output.drafts).toHaveLength(1);
    expect(output.notImported).toEqual([
      { scope: "row", name: "2", reason: "row-malformed" },
      { scope: "row", name: "3", reason: "row-malformed" },
    ]);
  });
});

describe("Bitwarden JSON: 登录", () => {
  it("账号, 密码, 第一个网址, TOTP, 备注与文件夹对应, 其余网址写成自定义字段", async () => {
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([bitwardenLogin()]),
    );
    const [draft] = drafts;
    expect(draft.typeKey).toBe("login");
    expect(draft.name).toBe("Example Site");
    expect(draft.fields).toEqual({
      account: "demo.user@example.invalid",
      password: "FakePassw0rd!",
      url: "https://example.com/login",
    });
    expect(draft.notes).toBe("Fake login for import test");
    expect(draft.totp).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(draft.folderPath).toBe("Demo/Work");
    expect(draft.customFields[0]).toEqual({
      label: "网址 2",
      value: "https://example.org",
      isHidden: false,
    });
  });

  it("自定义字段: 文本是普通, 隐藏保持隐藏, 关联类型不带入并记损失, 布尔写成文本", async () => {
    const item = bitwardenLogin({
      fields: [
        { name: "文本", value: "a", type: 0 },
        { name: "隐藏", value: "b", type: 1 },
        { name: "布尔", value: "true", type: 2 },
        { name: "关联", value: null, type: 3, linkedId: 100 },
      ],
      login: { username: "u", password: "p" },
    });
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([item]),
    );
    expect(drafts[0].customFields).toEqual([
      { label: "文本", value: "a", isHidden: false },
      { label: "隐藏", value: "b", isHidden: true },
      { label: "布尔", value: "true", isHidden: false },
    ]);
    expect(drafts[0].losses).toContainEqual({
      reason: "linked-field-unsupported",
      fieldName: "关联",
    });
  });
});

describe("Bitwarden JSON: 带不进的内容", () => {
  it("收藏, 重新提示, 密码历史, 归档, 通行密钥各记一项损失", async () => {
    const item = bitwardenLogin({
      reprompt: 1,
      passwordHistory: [{ lastUsedDate: "x", password: "old" }],
      archivedDate: "2026-01-01T00:00:00.000Z",
      login: { username: "u", password: "p", fido2Credentials: [{ id: "k" }] },
    });
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([item]),
    );
    expect(drafts[0].losses.map((loss) => loss.reason).sort()).toEqual([
      "archived-unsupported",
      "favorite-unsupported",
      "passkey-unsupported",
      "password-history-unsupported",
      "reprompt-unsupported",
    ]);
  });

  it("损失里不含任何字段的值", async () => {
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([bitwardenLogin({ reprompt: 1 })]),
    );
    const text = JSON.stringify(drafts[0].losses);
    expect(text).not.toContain("FakePassw0rd!");
    expect(text).not.toContain("JBSWY3DPEHPK3PXP");
  });

  it("类型 6 到 8 没有对应类型, 草稿没有类型键", async () => {
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([
        { type: 6, name: "银行账户" },
        { type: 99, name: "未知" },
      ]),
    );
    expect(drafts.map((draft) => [draft.name, draft.typeKey])).toEqual([
      ["银行账户", undefined],
      ["未知", undefined],
    ]);
  });
});

describe("Bitwarden JSON: 安全笔记, 卡, 身份与 SSH 密钥", () => {
  it("安全笔记的正文进 '内容' 字段, 备注留空", async () => {
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([bitwardenNote()]),
    );
    expect(drafts[0].typeKey).toBe("secureNote");
    expect(drafts[0].fields).toEqual({
      content: "Fake secure note.\nLine two.",
    });
    expect(drafts[0].notes).toBe("");
  });

  it("卡: 有效期写成 MM/YYYY, 卡组织写成自定义字段", async () => {
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([bitwardenCard()]),
    );
    expect(drafts[0].typeKey).toBe("bankCard");
    expect(drafts[0].fields).toEqual({
      cardholder: "Demo User",
      cardNumber: "4242424242424242",
      expiry: "02/2030",
      securityCode: "000",
    });
    expect(drafts[0].customFields).toEqual([
      { label: "卡组织", value: "Visa", isHidden: false },
    ]);
  });

  it("SSH 密钥: 私钥与公钥对应, 指纹写成自定义字段", async () => {
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([bitwardenSshKey()]),
    );
    expect(drafts[0].typeKey).toBe("sshKey");
    expect(drafts[0].fields.publicKey).toContain("ssh-ed25519");
    expect(drafts[0].customFields).toEqual([
      { label: "指纹", value: "SHA256:fakefingerprint", isHidden: false },
    ]);
  });
});

describe("Bitwarden JSON: 身份", () => {
  it("全名, 地址多行, 证件号取第一个非空, 其余证件号写成隐藏字段", async () => {
    const { drafts } = await parseOutput(
      bitwardenJsonAdapter,
      bitwardenExport([bitwardenIdentity()]),
    );
    const [draft] = drafts;
    expect(draft.typeKey).toBe("identity");
    expect(draft.fields).toEqual({
      fullName: "Demo User",
      email: "demo@example.invalid",
      phone: "5555550100",
      documentNumber: "P1234567",
      address: "1 Example Street\nExampleville EX 00000\nUS",
    });
    expect(draft.customFields).toEqual([
      { label: "称谓", value: "Mr", isHidden: false },
      { label: "公司", value: "Example Inc.", isHidden: false },
      { label: "用户名", value: "demo", isHidden: false },
      { label: "驾照号", value: "L7654321", isHidden: true },
      { label: "社保号", value: "000-00-0000", isHidden: true },
    ]);
  });
});
