import { describe, expect, it } from "vitest";

import { formatCsvRow } from "./browser-csv-columns";

describe("浏览器密码 CSV 的行写出", () => {
  it("普通字段不加引号, 行以 CRLF 结束", () => {
    expect(formatCsvRow(["a", "b", ""])).toBe("a,b,\r\n");
  });

  it("含逗号或引号的字段加引号, 引号双写", () => {
    expect(formatCsvRow(["x,y", 'say "hi"'])).toBe('"x,y","say ""hi"""\r\n');
  });

  it("只含 CR 或只含 LF 的字段也加引号", () => {
    expect(formatCsvRow(["a\rb", "c\nd", "e\r\nf"])).toBe(
      '"a\rb","c\nd","e\r\nf"\r\n',
    );
  });

  it("以等号, 加号, 减号, @ 开头的值原样输出, 不加防公式前缀", () => {
    expect(formatCsvRow(["=1+1", "+2", "-3", "@x"])).toBe("=1+1,+2,-3,@x\r\n");
  });

  it("非 ASCII 字符与首尾空格原样输出", () => {
    expect(formatCsvRow(["中文 名称", " lead", "trail "])).toBe(
      "中文 名称, lead,trail \r\n",
    );
  });
});
