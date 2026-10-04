import { describe, expect, it, vi } from "vitest";

import { MAX_ATTACHMENT_BYTES } from "@shared/attachments/attachment-limits";

import {
  createFakeSource,
  virtualPath,
} from "../testing/attachment-ports-fixture";
import { AttachmentCandidateReader } from "./attachment-candidate-reader";

describe("AttachmentCandidateReader.inspect", () => {
  it("合规的文件按顺序返回路径, 名称与大小, 不读取内容", async () => {
    const source = createFakeSource({
      [virtualPath("证书-密钥(测试).pem")]: { content: Buffer.alloc(3) },
      [virtualPath("截图 2026年.png")]: { content: Buffer.alloc(5) },
    });
    const reader = new AttachmentCandidateReader({
      source: source.port,
      onFailure: vi.fn(),
    });

    const result = await reader.inspect([
      virtualPath("证书-密钥(测试).pem"),
      virtualPath("截图 2026年.png"),
    ]);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          filePath: virtualPath("证书-密钥(测试).pem"),
          name: "证书-密钥(测试).pem",
          size: 3,
        },
        {
          filePath: virtualPath("截图 2026年.png"),
          name: "截图 2026年.png",
          size: 5,
        },
      ],
    });
    expect(source.readFile).not.toHaveBeenCalled();
  });
});

describe("AttachmentCandidateReader.inspect 的失败", () => {
  it("空文件, 超过单个上限的文件, 目录与不存在的文件都带文件名失败, 不读内容", async () => {
    const source = createFakeSource({
      [virtualPath("空.txt")]: { content: Buffer.alloc(0) },
      [virtualPath("大.bin")]: {
        content: Buffer.alloc(1),
        reportedSize: MAX_ATTACHMENT_BYTES + 1,
      },
      [virtualPath("目录")]: { content: Buffer.alloc(0), isFile: false },
    });
    const onFailure = vi.fn();
    const reader = new AttachmentCandidateReader({
      source: source.port,
      onFailure,
    });

    const results = await Promise.all(
      ["空.txt", "大.bin", "目录", "不存在.txt"].map((name) =>
        reader.inspect([virtualPath(name)]),
      ),
    );

    expect(results).toEqual([
      { ok: false, reason: "empty-file", fileName: "空.txt" },
      { ok: false, reason: "file-too-large", fileName: "大.bin" },
      { ok: false, reason: "not-a-file", fileName: "目录" },
      { ok: false, reason: "read-failed", fileName: "不存在.txt" },
    ]);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(source.readFile).not.toHaveBeenCalled();
  });

  it("相对路径是无效输入", async () => {
    const reader = new AttachmentCandidateReader({
      source: createFakeSource({}).port,
      onFailure: vi.fn(),
    });

    expect(await reader.inspect(["relative/a.txt"])).toEqual({
      ok: false,
      reason: "invalid-input",
    });
  });
});

describe("AttachmentCandidateReader.inspect 只报第一个", () => {
  it("一批里只报按顺序出现的第一个不合规文件", async () => {
    const source = createFakeSource({
      [virtualPath("好.txt")]: { content: Buffer.alloc(1) },
      [virtualPath("先空.txt")]: { content: Buffer.alloc(0) },
      [virtualPath("后目录")]: { content: Buffer.alloc(0), isFile: false },
    });
    const reader = new AttachmentCandidateReader({
      source: source.port,
      onFailure: vi.fn(),
    });

    const result = await reader.inspect([
      virtualPath("好.txt"),
      virtualPath("先空.txt"),
      virtualPath("后目录"),
    ]);

    expect(result).toEqual({
      ok: false,
      reason: "empty-file",
      fileName: "先空.txt",
    });
  });
});

describe("AttachmentCandidateReader.readAll", () => {
  it("按顺序读取全部内容", async () => {
    const source = createFakeSource({
      [virtualPath("甲.txt")]: { content: Buffer.from([1]) },
      [virtualPath("乙.txt")]: { content: Buffer.from([2, 3]) },
    });
    const reader = new AttachmentCandidateReader({
      source: source.port,
      onFailure: vi.fn(),
    });

    const result = await reader.readAll([
      { filePath: virtualPath("甲.txt"), name: "甲.txt", size: 1 },
      { filePath: virtualPath("乙.txt"), name: "乙.txt", size: 2 },
    ]);

    expect(result).toEqual({
      ok: true,
      value: [
        { name: "甲.txt", content: Buffer.from([1]) },
        { name: "乙.txt", content: Buffer.from([2, 3]) },
      ],
    });
  });

  it("有一个文件读取失败时整批失败, 带失败的文件名并通知回调", async () => {
    const readError = new Error("EIO");
    const source = createFakeSource({
      [virtualPath("甲.txt")]: { content: Buffer.from([1]) },
      [virtualPath("乙.txt")]: { content: Buffer.from([2]), readError },
    });
    const onFailure = vi.fn();
    const reader = new AttachmentCandidateReader({
      source: source.port,
      onFailure,
    });

    const result = await reader.readAll([
      { filePath: virtualPath("甲.txt"), name: "甲.txt", size: 1 },
      { filePath: virtualPath("乙.txt"), name: "乙.txt", size: 1 },
    ]);

    expect(result).toEqual({
      ok: false,
      reason: "read-failed",
      fileName: "乙.txt",
    });
    expect(onFailure).toHaveBeenCalledWith(readError);
  });
});
