import { describe, expect, it } from "vitest";

import { parseOutput, parseSample } from "../../testing/import-draft-fixture";
import { browserCsvAdapter } from "./browser-csv-adapter";

/**
 * Chrome 与 Edge 的导出: name,url,username,password,note 五列, 含逗号, 引号与换行的字段加引号.
 */
const CHROME_SAMPLE = [
  "name,url,username,password,note",
  'example.com,https://example.com/login,alice,"p@ss,w0rd","line1\nsay ""hi"""',
  "github.com,https://github.com/login,bob,s3cret,",
].join("\r\n");

/**
 * Firefox 的导出: 九列, 没有名称与备注, 第二行是 HTTP 认证登录.
 */
const FIREFOX_SAMPLE = [
  '"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"',
  '"https://example.com","alice","p@ss,w0rd",,"https://example.com","{g1}","1767225600000","1767225600000","1767225600000"',
  '"https://intranet.example.org","bob","s3cret","Restricted Area",,"{g2}","1767225600000","1767225600000","1767225600000"',
].join("\r\n");

describe("浏览器 CSV: Chrome 与 Edge", () => {
  it("名称, 网址, 账号, 密码, 备注对应, 引号里的逗号, 双引号与换行原样保留", async () => {
    const { drafts } = await parseOutput(browserCsvAdapter, CHROME_SAMPLE);
    expect(drafts[0].name).toBe("example.com");
    expect(drafts[0].typeKey).toBe("login");
    expect(drafts[0].fields).toEqual({
      account: "alice",
      password: "p@ss,w0rd",
      url: "https://example.com/login",
    });
    expect(drafts[0].notes).toBe('line1\nsay "hi"');
    expect(drafts[1].notes).toBe("");
  });

  it("没有 note 列的旧版导出也能识别", async () => {
    const text = "name,url,username,password\nsite,https://a.example,u,p\n";
    const { drafts } = await parseOutput(browserCsvAdapter, text);
    expect(drafts[0].notes).toBe("");
    expect(drafts[0].fields.account).toBe("u");
  });
});

describe("浏览器 CSV: Firefox", () => {
  it("没有名称列时用网址主机名作名称", async () => {
    const { drafts } = await parseOutput(browserCsvAdapter, FIREFOX_SAMPLE);
    expect(drafts.map((draft) => draft.name)).toEqual([
      "example.com",
      "intranet.example.org",
    ]);
  });

  it("HTTP 认证的 httpRealm 写成自定义字段, 时间与 guid 不进清单", async () => {
    const { drafts } = await parseOutput(browserCsvAdapter, FIREFOX_SAMPLE);
    expect(drafts[0].customFields).toEqual([]);
    expect(drafts[1].customFields).toEqual([
      { label: "HTTP 认证域", value: "Restricted Area", isHidden: false },
    ]);
    expect(drafts.every((draft) => draft.losses.length === 0)).toBe(true);
  });

  it("网址解析不出主机名时用整个网址作名称", async () => {
    const text = "url,username,password\nexample.com/login,u,p\n";
    const { drafts } = await parseOutput(browserCsvAdapter, text);
    expect(drafts[0].name).toBe("example.com/login");
  });
});

describe("浏览器 CSV: 文件级检查", () => {
  it("缺少 url, username, password 任一列或列名大小写不对, 报格式不符", async () => {
    expect(await parseSample(browserCsvAdapter, "name,url,username\n")).toEqual(
      {
        ok: false,
        reason: "format-mismatch",
      },
    );
    expect(
      await parseSample(browserCsvAdapter, "URL,Username,Password\n"),
    ).toEqual({
      ok: false,
      reason: "format-mismatch",
    });
  });

  it("多余的列被忽略, 缺列的行记为没能解析的行", async () => {
    const text = [
      "url,username,password,extra,more",
      "https://a.example,u,p,x,y",
      "https://b.example,u,p",
    ].join("\n");
    const output = await parseOutput(browserCsvAdapter, text);
    expect(output.drafts).toHaveLength(1);
    expect(output.notImported).toEqual([
      { scope: "row", name: "3", reason: "row-malformed" },
    ]);
  });
});
