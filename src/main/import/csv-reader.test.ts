import { describe, expect, it } from "vitest";

import { createTestObserver } from "../testing/import-draft-fixture";
import { hasColumns, readCsvTable, toRecord } from "./csv-reader";

/**
 * 读一段 CSV 文本.
 * @param text CSV 文本.
 * @returns 解析结果.
 */
function read(text: string): ReturnType<typeof readCsvTable> {
  return readCsvTable(text, createTestObserver());
}

describe("CSV 读取: 引号与换行", () => {
  it("引号里的逗号, 双引号转义与换行都原样保留", async () => {
    const result = await read('a,b\r\n"x,1","say ""hi""\nnext"\r\n');
    expect(result).toEqual({
      ok: true,
      value: {
        header: ["a", "b"],
        rows: [{ values: ["x,1", 'say "hi"\nnext'], line: 3 }],
      },
    });
  });

  it("CRLF, LF 与结尾没有换行的文件都能读", async () => {
    for (const text of ["a,b\r\n1,2\r\n", "a,b\n1,2\n", "a,b\n1,2"]) {
      const result = await read(text);
      expect(result.ok && result.value.rows[0].values).toEqual(["1", "2"]);
    }
  });

  it("空行跳过, 非 ASCII 原样保留", async () => {
    const result = await read("名称,备注\n\n邮箱,é 中文 😀\n\n");
    expect(result.ok && result.value.rows.map((row) => row.values)).toEqual([
      ["邮箱", "é 中文 😀"],
    ]);
  });
});

describe("CSV 读取: BOM, 表头与错误", () => {
  it("开头的 BOM 被跳过, 不污染第一列的列名", async () => {
    const result = await read("﻿url,username\nhttps://a.example,alice\n");
    expect(result.ok && result.value.header).toEqual(["url", "username"]);
  });

  it("没有任何内容的文本没有表头, 报格式不符", async () => {
    expect(await read("")).toEqual({ ok: false, reason: "format-mismatch" });
  });

  it("引号没有闭合时整个文件失败, 失败里只有原因与行号", async () => {
    const result = await read('a,b\n1,"never closed\nmore');
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: "malformed-file" });
    expect(JSON.stringify(result)).not.toContain("never closed");
  });

  it("引号错位时整个文件失败, 失败里没有字段文本", async () => {
    const result = await read('a,b\n1,x"secret-value"y\n');
    expect(result).toMatchObject({ ok: false, reason: "malformed-file" });
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });
});

describe("CSV 读取: 列数与记录", () => {
  it("列数与表头不一致的行也原样返回, 由适配器判断", async () => {
    const result = await read("a,b,c\n1,2\n1,2,3,4\n1,2,3\n");
    expect(
      result.ok && result.value.rows.map((row) => row.values.length),
    ).toEqual([2, 4, 3]);
  });

  it("按表头转成记录: 列数不一致时为 undefined, 列名重复取第一列", () => {
    const header = ["a", "b", "a"];
    expect(toRecord(header, { values: ["1", "2", "3"], line: 2 })).toEqual({
      a: "1",
      b: "2",
    });
    expect(toRecord(header, { values: ["1"], line: 3 })).toBeUndefined();
  });

  it("列名里的 __proto__ 不会改写记录的原型", () => {
    const record = toRecord(["__proto__"], { values: ["x"], line: 2 });
    expect(Object.getPrototypeOf(record)).toBe(Object.prototype);
    expect(Object.keys(record ?? {})).toEqual(["__proto__"]);
  });

  it("判断表头是否含有全部必需列, 区分大小写", () => {
    expect(hasColumns(["url", "username", "x"], ["url", "username"])).toBe(
      true,
    );
    expect(hasColumns(["URL", "username"], ["url", "username"])).toBe(false);
  });
});
