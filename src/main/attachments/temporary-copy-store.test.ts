import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import { NODE_TEMPORARY_COPY_FILE_SYSTEM } from "./node-attachment-file-system";
import { TemporaryCopyStore } from "./temporary-copy-store";

/**
 * 创建指向给定专属目录的存储, 子目录编号依次为 open-1, open-2.
 * @param baseDirectory 专属目录路径.
 * @param onFailure 删除失败时的回调.
 * @returns 存储.
 */
function createStore(
  baseDirectory: string,
  onFailure: (error: unknown) => void = vi.fn(),
): TemporaryCopyStore {
  let counter = 0;
  return new TemporaryCopyStore({
    fileSystem: NODE_TEMPORARY_COPY_FILE_SYSTEM,
    baseDirectory,
    createIdentifier: () => `open-${(counter += 1)}`,
    onFailure,
  });
}

describe("TemporaryCopyStore.create", () => {
  const getDirectory = useTemporaryDirectory("temporary-copy-create");

  it("创建的副本放在专属目录下随机命名的子目录里, 保留原文件名, 内容逐字节一致", async () => {
    const baseDirectory = join(getDirectory(), "attachment-open");
    const content = Buffer.from(Array.from({ length: 256 }, (_, i) => i));

    const filePath = await createStore(baseDirectory).create(
      "证书-密钥(测试).pem",
      content,
    );

    expect(filePath).toBe(join(baseDirectory, "open-1", "证书-密钥(测试).pem"));
    expect((await readFile(filePath)).equals(content)).toBe(true);
  });

  it("副本是只读的, 写入会失败, 内容不变", async () => {
    const store = createStore(join(getDirectory(), "attachment-open"));
    const filePath = await store.create("a.txt", Buffer.from("原内容"));

    await expect(writeFile(filePath, "被改了")).rejects.toThrow();

    expect(await readFile(filePath, "utf8")).toBe("原内容");
  });

  it("每次创建用不同的子目录, 同名附件的副本互不覆盖", async () => {
    const baseDirectory = join(getDirectory(), "attachment-open");
    const store = createStore(baseDirectory);

    await store.create("同名.txt", Buffer.from("甲"));
    await store.create("同名.txt", Buffer.from("乙"));

    expect((await readdir(baseDirectory)).sort()).toEqual(["open-1", "open-2"]);
  });
});

describe("TemporaryCopyStore.discardAll", () => {
  const getDirectory = useTemporaryDirectory("temporary-copy-discard");

  it("删除专属目录与全部只读副本, 目录不存在时也不报错", async () => {
    const baseDirectory = join(getDirectory(), "attachment-open");
    const store = createStore(baseDirectory);
    await store.create("a.txt", Buffer.from("甲"));
    await store.create("b.txt", Buffer.from("乙"));

    store.discardAll();
    store.discardAll();

    expect(existsSync(baseDirectory)).toBe(false);
  });

  it("删除失败时通知回调, 不向上抛", () => {
    const failure = new Error("EBUSY");
    const onFailure = vi.fn();
    const store = new TemporaryCopyStore({
      fileSystem: {
        ...NODE_TEMPORARY_COPY_FILE_SYSTEM,
        removeDirectoryTreeSync: () => {
          throw failure;
        },
      },
      baseDirectory: join(getDirectory(), "attachment-open"),
      createIdentifier: () => "open-1",
      onFailure,
    });

    expect(() => store.discardAll()).not.toThrow();
    expect(onFailure).toHaveBeenCalledWith(failure);
  });
});
