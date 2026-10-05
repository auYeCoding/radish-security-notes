import { describe, expect, it } from "vitest";

import { parseOutput, parseSample } from "../../testing/import-draft-fixture";
import { bitwardenCsvAdapter } from "./bitwarden-csv-adapter";

/**
 * Bitwarden 个人库 CSV 的表头 (官方文档的 11 列).
 */
const HEADER =
  "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp";

/**
 * 含一个登录 (两个网址, 两个自定义字段, 收藏, 文件夹, TOTP) 与一个安全笔记的样例.
 */
const SAMPLE = [
  HEADER,
  'Demo\\Work,1,login,Example Site,Fake login for import test,"api_label: demo-label\npin_hint: 0000",0,"https://example.com/login,https://example.org",demo.user@example.invalid,FakePassw0rd!,otpauth://totp/Example:demo?secret=JBSWY3DPEHPK3PXP',
  ',,note,Example Note,"Fake secure note.\nLine two.",,0,,,,',
].join("\r\n");

describe("Bitwarden CSV: 登录", () => {
  it("账号, 密码, 第一个网址, TOTP, 备注对应, 反斜杠分层的文件夹改成斜杠", async () => {
    const { drafts } = await parseOutput(bitwardenCsvAdapter, SAMPLE);
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
  });

  it("其余网址与 fields 单元格里的字段写成普通自定义字段, 收藏记损失", async () => {
    const { drafts } = await parseOutput(bitwardenCsvAdapter, SAMPLE);
    expect(drafts[0].customFields).toEqual([
      { label: "网址 2", value: "https://example.org", isHidden: false },
      { label: "api_label", value: "demo-label", isHidden: false },
      { label: "pin_hint", value: "0000", isHidden: false },
    ]);
    expect(drafts[0].losses).toEqual([{ reason: "favorite-unsupported" }]);
  });
});

describe("Bitwarden CSV: 安全笔记与字段单元格", () => {
  it("note 类型成为安全笔记, 正文进内容字段, 备注留空", async () => {
    const { drafts } = await parseOutput(bitwardenCsvAdapter, SAMPLE);
    expect(drafts[1].typeKey).toBe("secureNote");
    expect(drafts[1].fields).toEqual({
      content: "Fake secure note.\nLine two.",
    });
    expect(drafts[1].notes).toBe("");
  });

  it("fields 里按第一个冒号加空格切开, 值里再出现冒号加空格不影响, 没有分隔的行记损失", async () => {
    const text = [
      HEADER,
      ',,login,甲,,"备注: 含: 冒号\n无分隔行",0,,u,p,',
    ].join("\n");
    const { drafts } = await parseOutput(bitwardenCsvAdapter, text);
    expect(drafts[0].customFields).toEqual([
      { label: "备注", value: "含: 冒号", isHidden: false },
    ]);
    expect(drafts[0].losses).toEqual([{ reason: "unparsable-field-line" }]);
    expect(JSON.stringify(drafts[0].losses)).not.toContain("无分隔行");
  });

  it("重新提示与归档记损失, 类型是其它值时按登录处理", async () => {
    const text = [
      `${HEADER},archivedDate`,
      ",,Login,甲,,,1,,u,p,,2026-01-01T00:00:00.000Z",
    ].join("\n");
    const { drafts } = await parseOutput(bitwardenCsvAdapter, text);
    expect(drafts[0].typeKey).toBe("login");
    expect(drafts[0].losses.map((loss) => loss.reason)).toEqual([
      "reprompt-unsupported",
      "archived-unsupported",
    ]);
  });
});

describe("Bitwarden CSV: 文件级检查", () => {
  it("组织库导出 (表头是 collections) 不支持", async () => {
    const text =
      "collections,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n";
    expect(await parseSample(bitwardenCsvAdapter, text)).toEqual({
      ok: false,
      reason: "organization-export-unsupported",
    });
  });

  it("缺少必需列或列名大小写不对, 报格式不符", async () => {
    expect(
      await parseSample(bitwardenCsvAdapter, "url,username,password\n"),
    ).toEqual({
      ok: false,
      reason: "format-mismatch",
    });
    expect(
      await parseSample(bitwardenCsvAdapter, HEADER.toUpperCase().concat("\n")),
    ).toEqual({ ok: false, reason: "format-mismatch" });
  });

  it("列数与表头不一致的行记为没能解析的行, 其余行照常", async () => {
    const text = [HEADER, "只有两列,x", ",,login,乙,,,0,,u,p,"].join("\n");
    const output = await parseOutput(bitwardenCsvAdapter, text);
    expect(output.drafts.map((draft) => draft.name)).toEqual(["乙"]);
    expect(output.notImported).toEqual([
      { scope: "row", name: "2", reason: "row-malformed" },
    ]);
  });
});
