import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  NODE_ATTACHMENT_SINK,
  NODE_ATTACHMENT_SOURCE,
  NODE_TEMPORARY_COPY_FILE_SYSTEM,
} from "./node-attachment-file-system";

describe("NODE_ATTACHMENT_SOURCE", () => {
  const getDirectory = useTemporaryDirectory("node-attachment-source");

  it("报告普通文件的字节数, 目录不是普通文件, 不存在的路径拒绝", async () => {
    const filePath = join(getDirectory(), "证书.pem");
    await writeFile(filePath, Buffer.from([1, 2, 3]));
    const directory = join(getDirectory(), "子目录");
    await mkdir(directory);

    expect(await NODE_ATTACHMENT_SOURCE.statFile(filePath)).toEqual({
      isFile: true,
      size: 3,
    });
    expect((await NODE_ATTACHMENT_SOURCE.statFile(directory)).isFile).toBe(
      false,
    );
    await expect(
      NODE_ATTACHMENT_SOURCE.statFile(join(getDirectory(), "不存在")),
    ).rejects.toThrow();
  });

  it("读回文件的全部字节", async () => {
    const filePath = join(getDirectory(), "a.bin");
    const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    await writeFile(filePath, bytes);

    expect(
      (await NODE_ATTACHMENT_SOURCE.readFile(filePath)).equals(bytes),
    ).toBe(true);
  });
});

describe("NODE_ATTACHMENT_SINK", () => {
  const getDirectory = useTemporaryDirectory("node-attachment-sink");

  it("写入, 改名覆盖已有文件, 删除; 删除不存在的文件不报错", async () => {
    const partial = join(getDirectory(), "a.part");
    const target = join(getDirectory(), "a.bin");
    await writeFile(target, "旧");

    await NODE_ATTACHMENT_SINK.writeFile(partial, Buffer.from([7, 8]));
    await NODE_ATTACHMENT_SINK.renameFile(partial, target);
    await NODE_ATTACHMENT_SINK.removeFile(join(getDirectory(), "不存在"));

    expect(await readFile(target)).toEqual(Buffer.from([7, 8]));
    expect(await readdir(getDirectory())).toEqual(["a.bin"]);
  });
});

describe("NODE_TEMPORARY_COPY_FILE_SYSTEM", () => {
  const getDirectory = useTemporaryDirectory("node-temporary-copy");

  it("创建多级目录, 写入只读文件, 并能删除含只读文件的整棵目录", async () => {
    const directory = join(getDirectory(), "attachment-open", "open-1");
    const filePath = join(directory, "a.txt");

    await NODE_TEMPORARY_COPY_FILE_SYSTEM.makeDirectory(directory);
    await NODE_TEMPORARY_COPY_FILE_SYSTEM.writeFile(filePath, Buffer.from("x"));
    await NODE_TEMPORARY_COPY_FILE_SYSTEM.makeReadOnly(filePath);
    await expect(writeFile(filePath, "y")).rejects.toThrow();
    NODE_TEMPORARY_COPY_FILE_SYSTEM.removeDirectoryTreeSync(
      join(getDirectory(), "attachment-open"),
    );

    expect(existsSync(join(getDirectory(), "attachment-open"))).toBe(false);
  });

  it("多级目录里的多个只读文件也能整棵删除, 目录不存在时不报错", async () => {
    const base = join(getDirectory(), "attachment-open");
    for (const name of ["open-1", "open-2"]) {
      const directory = join(base, name, "深层");
      await NODE_TEMPORARY_COPY_FILE_SYSTEM.makeDirectory(directory);
      const filePath = join(directory, "副本.txt");
      await NODE_TEMPORARY_COPY_FILE_SYSTEM.writeFile(
        filePath,
        Buffer.from("x"),
      );
      await NODE_TEMPORARY_COPY_FILE_SYSTEM.makeReadOnly(filePath);
    }

    NODE_TEMPORARY_COPY_FILE_SYSTEM.removeDirectoryTreeSync(base);
    NODE_TEMPORARY_COPY_FILE_SYSTEM.removeDirectoryTreeSync(base);

    expect(existsSync(base)).toBe(false);
  });
});
