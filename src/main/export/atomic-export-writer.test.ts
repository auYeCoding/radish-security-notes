import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import { writeFileAtomically } from "./atomic-export-writer";
import { NODE_EXPORT_FILE } from "./node-export-file-system";

/**
 * 先写出一段, 再抛出错误的字节流, 模拟源中途出错.
 * @yields 一段字节.
 */
async function* failingSource(): AsyncGenerator<Buffer> {
  yield Buffer.from("一半");
  throw new Error("源出错");
}

/**
 * 写出一段字节之后触发中止信号, 再稍等才写出下一段, 模拟用户中途取消.
 * @param controller 中止控制器.
 * @yields 一段字节.
 */
async function* abortingSource(
  controller: AbortController,
): AsyncGenerator<Buffer> {
  yield Buffer.from("开头");
  controller.abort();
  await new Promise((resolve) => setTimeout(resolve, 50));
  yield Buffer.from("结尾");
}

/**
 * 用真实文件系统原子写出一个字节流.
 * @param target 目标文件的路径.
 * @param source 要写出的字节流.
 * @param signal 中止信号, 默认不会触发.
 * @param onWritten 字节流全部写进临时文件之后调用的回调.
 * @returns 写出的字节数.
 */
function writeTo(
  target: string,
  source: Readable,
  signal: AbortSignal = new AbortController().signal,
  onWritten: () => void = () => undefined,
): Promise<number> {
  return writeFileAtomically({
    file: NODE_EXPORT_FILE,
    targetPath: target,
    source,
    signal,
    onWritten,
  });
}

describe("原子写出: 成功", () => {
  const getDirectory = useTemporaryDirectory("export-atomic-success");

  it("目标文件内容完整, 同目录没有临时文件, 返回字节数", async () => {
    const target = join(getDirectory(), "out.bin");
    const size = await writeTo(
      target,
      Readable.from([Buffer.from("第一段"), Buffer.from("第二段")]),
    );
    expect(readFileSync(target, "utf8")).toBe("第一段第二段");
    expect(size).toBe(Buffer.byteLength("第一段第二段"));
    expect(readdirSync(getDirectory())).toEqual(["out.bin"]);
  });

  it("先调用 onWritten 再改名", async () => {
    const target = join(getDirectory(), "out.bin");
    const existed: boolean[] = [];
    await writeTo(
      target,
      Readable.from([Buffer.from("x")]),
      new AbortController().signal,
      () => existed.push(readdirSync(getDirectory()).includes("out.bin")),
    );
    expect(existed).toEqual([false]);
    expect(readdirSync(getDirectory())).toEqual(["out.bin"]);
  });

  it("目标已存在时被新内容替换", async () => {
    const target = join(getDirectory(), "out.bin");
    writeFileSync(target, "旧");
    await writeTo(target, Readable.from([Buffer.from("新")]));
    expect(readFileSync(target, "utf8")).toBe("新");
  });
});

describe("原子写出: 源流出错", () => {
  const getDirectory = useTemporaryDirectory("export-atomic-source-error");

  it("拒绝原错误, 目标不存在, 临时文件被删除", async () => {
    const target = join(getDirectory(), "out.bin");
    await expect(
      writeTo(target, Readable.from(failingSource())),
    ).rejects.toThrow("源出错");
    expect(readdirSync(getDirectory())).toEqual([]);
  });

  it("目标原有的文件保持原样", async () => {
    const target = join(getDirectory(), "out.bin");
    writeFileSync(target, "原有内容");
    await expect(
      writeTo(target, Readable.from(failingSource())),
    ).rejects.toThrow();
    expect(readFileSync(target, "utf8")).toBe("原有内容");
    expect(readdirSync(getDirectory())).toEqual(["out.bin"]);
  });
});

describe("原子写出: 中止与文件系统失败", () => {
  const getDirectory = useTemporaryDirectory("export-atomic-failures");

  it("被中止信号中止: 拒绝中止错误, 不留任何文件", async () => {
    const target = join(getDirectory(), "out.bin");
    const controller = new AbortController();
    await expect(
      writeTo(
        target,
        Readable.from(abortingSource(controller)),
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(readdirSync(getDirectory())).toEqual([]);
  });

  it("改名失败 (目标是一个目录): 拒绝, 临时文件被删除, 目录保持原样", async () => {
    const target = join(getDirectory(), "taken");
    mkdirSync(target);
    await expect(
      writeTo(target, Readable.from([Buffer.from("x")])),
    ).rejects.toBeInstanceOf(Error);
    expect(readdirSync(getDirectory())).toEqual(["taken"]);
  });

  it("目标所在目录不存在: 拒绝, 不创建目录", async () => {
    const target = join(getDirectory(), "missing", "out.bin");
    await expect(
      writeTo(target, Readable.from([Buffer.from("x")])),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(readdirSync(getDirectory())).toEqual([]);
  });
});
