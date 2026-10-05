import { describe, expect, it, vi } from "vitest";

import { MAX_IMPORT_FILE_BYTES } from "@shared/import/import-limits";

import { readImportText } from "./import-file-reader";
import type { ImportFilePort } from "./import-ports";

/**
 * 测试里用的来源文件路径.
 */
const SAMPLE_PATH = "C:/sample/export.csv";

/**
 * 建一个读取固定字节的假文件端口.
 * @param bytes 文件内容.
 * @param overrides 要替换的端口方法.
 * @returns 假文件端口.
 */
function fileOf(
  bytes: Buffer,
  overrides: Partial<ImportFilePort> = {},
): ImportFilePort {
  return {
    statFile: async () => ({ isFile: true, size: bytes.length }),
    readFile: async () => bytes,
    ...overrides,
  };
}

describe("读取来源文件: 解码", () => {
  it("把 UTF-8 文本原样读出, 非 ASCII 与换行都保留", async () => {
    const text = '名称,备注\r\n邮箱,"第一行\n第二行 é"\r\n';
    const result = await readImportText(
      { file: fileOf(Buffer.from(text, "utf8")), onFailure: vi.fn() },
      SAMPLE_PATH,
    );
    expect(result).toEqual({ ok: true, value: text });
  });

  it("带 UTF-8 BOM 的文件照常读出, 文本里没有 BOM", async () => {
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from("url,username", "utf8"),
    ]);
    const result = await readImportText(
      { file: fileOf(bytes), onFailure: vi.fn() },
      SAMPLE_PATH,
    );
    expect(result).toEqual({ ok: true, value: "url,username" });
  });

  it("解码之后把读入的缓冲区清零", async () => {
    const bytes = Buffer.from("secret-password", "utf8");
    await readImportText(
      { file: fileOf(bytes), onFailure: vi.fn() },
      SAMPLE_PATH,
    );
    expect(bytes.every((byte) => byte === 0)).toBe(true);
  });
});

describe("读取来源文件: 不是 UTF-8", () => {
  it.each([
    ["UTF-16 小端带 BOM", Buffer.from([0xff, 0xfe, 0x61, 0x00])],
    ["UTF-16 大端带 BOM", Buffer.from([0xfe, 0xff, 0x00, 0x61])],
    ["非法的 UTF-8 字节", Buffer.from([0x61, 0xc3, 0x28])],
    ["没有 BOM 的 UTF-16", Buffer.from([0x61, 0x00, 0x62, 0x00])],
  ])("%s 报编码不支持", async (_name, bytes) => {
    const result = await readImportText(
      { file: fileOf(bytes), onFailure: vi.fn() },
      SAMPLE_PATH,
    );
    expect(result).toEqual({ ok: false, reason: "encoding-unsupported" });
  });
});

describe("读取来源文件: 文件状态", () => {
  it("目录不是文件, 报无法读取", async () => {
    const result = await readImportText(
      {
        file: fileOf(Buffer.alloc(0), {
          statFile: async () => ({ isFile: false, size: 10 }),
        }),
        onFailure: vi.fn(),
      },
      SAMPLE_PATH,
    );
    expect(result).toEqual({ ok: false, reason: "file-unreadable" });
  });

  it("空文件报文件为空", async () => {
    const result = await readImportText(
      { file: fileOf(Buffer.alloc(0)), onFailure: vi.fn() },
      SAMPLE_PATH,
    );
    expect(result).toEqual({ ok: false, reason: "file-empty" });
  });

  it("文件系统出错时报无法读取, 只把错误交给回调", async () => {
    const onFailure = vi.fn();
    const failure = new Error("EACCES");
    const result = await readImportText(
      {
        file: fileOf(Buffer.alloc(0), {
          statFile: async () => {
            throw failure;
          },
        }),
        onFailure,
      },
      SAMPLE_PATH,
    );
    expect(result).toEqual({ ok: false, reason: "file-unreadable" });
    expect(onFailure).toHaveBeenCalledWith(failure);
  });
});

describe("读取来源文件: 大小上限", () => {
  it("超过上限的文件不读取内容就拒绝", async () => {
    const readFile = vi.fn(async () => Buffer.from("a"));
    const result = await readImportText(
      {
        file: fileOf(Buffer.from("a"), {
          statFile: async () => ({
            isFile: true,
            size: MAX_IMPORT_FILE_BYTES + 1,
          }),
          readFile,
        }),
        onFailure: vi.fn(),
      },
      SAMPLE_PATH,
    );
    expect(result).toEqual({ ok: false, reason: "file-too-large" });
    expect(readFile).not.toHaveBeenCalled();
  });

  it("恰好等于上限的文件可以读", async () => {
    const result = await readImportText(
      {
        file: fileOf(Buffer.from("a"), {
          statFile: async () => ({ isFile: true, size: MAX_IMPORT_FILE_BYTES }),
        }),
        onFailure: vi.fn(),
      },
      SAMPLE_PATH,
    );
    expect(result.ok).toBe(true);
  });
});
