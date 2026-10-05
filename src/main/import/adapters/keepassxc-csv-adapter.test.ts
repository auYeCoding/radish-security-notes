import { describe, expect, it } from "vitest";

import { parseOutput, parseSample } from "../../testing/import-draft-fixture";
import { keepassxcCsvAdapter } from "./keepassxc-csv-adapter";

/**
 * KeePassXC 的导出: 表头与每个字段都加引号, 分组路径含根组名, 备注里有换行与双引号.
 */
const SAMPLE = [
  '"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"',
  '"Root/Email","Example","alice","p@ss,w0rd","https://example.com","line1 ""q""\nline2","otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP&period=30&digits=6&issuer=Example","0","2026-01-02T00:00:00","2026-01-01T00:00:00"',
  '"Root","根目录条目","bob","s3cret","","","","1","2026-01-02T00:00:00","2026-01-01T00:00:00"',
].join("\n");

describe("KeePassXC CSV: 字段对应", () => {
  it("标题, 用户名, 密码, 网址, 备注与 TOTP 对应", async () => {
    const { drafts } = await parseOutput(keepassxcCsvAdapter, SAMPLE);
    const [draft] = drafts;
    expect(draft.typeKey).toBe("login");
    expect(draft.name).toBe("Example");
    expect(draft.fields).toEqual({
      account: "alice",
      password: "p@ss,w0rd",
      url: "https://example.com",
    });
    expect(draft.notes).toBe('line1 "q"\nline2');
    expect(draft.totp).toContain("secret=JBSWY3DPEHPK3PXP");
  });

  it("图标, 修改时间与创建时间不带入也不进清单", async () => {
    const { drafts } = await parseOutput(keepassxcCsvAdapter, SAMPLE);
    expect(drafts.every((draft) => draft.losses.length === 0)).toBe(true);
  });
});

describe("KeePassXC CSV: 分组与文件级检查", () => {
  it("分组路径去掉根组名后作文件夹, 根组直属条目没有文件夹", async () => {
    const { drafts } = await parseOutput(keepassxcCsvAdapter, SAMPLE);
    expect(drafts.map((draft) => draft.folderPath)).toEqual(["Email", ""]);
  });

  it("多层分组保留完整路径", async () => {
    const text = [
      '"Group","Title","Username","Password","URL","Notes"',
      '"Root/工作/项目","甲","u","p","",""',
    ].join("\n");
    const { drafts } = await parseOutput(keepassxcCsvAdapter, text);
    expect(drafts[0].folderPath).toBe("工作/项目");
  });

  it("没有 TOTP 列的导出也能识别", async () => {
    const text = [
      '"Group","Title","Username","Password","URL","Notes"',
      '"Root","甲","u","p","",""',
    ].join("\n");
    const { drafts } = await parseOutput(keepassxcCsvAdapter, text);
    expect(drafts[0].totp).toBe("");
  });

  it("列名大小写不对 (浏览器格式) 报格式不符", async () => {
    expect(
      await parseSample(keepassxcCsvAdapter, "name,url,username,password\n"),
    ).toEqual({ ok: false, reason: "format-mismatch" });
  });
});
