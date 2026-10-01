import { readdir, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import { KeyFileStore } from "./key-file-store";
import { InvalidKeyRecordError, type KeyRecord } from "./key-record";
import { resolveVaultPaths, type VaultPaths } from "./vault-paths";

/**
 * 一份合法的系统保护记录.
 */
const RECORD: KeyRecord = {
  version: 1,
  protection: "system-protected",
  wrappedDataKey: "AAECAwQFBgcICQoLDA0ODw==",
};

/**
 * 测试用的密钥文件存储及其路径.
 */
interface StoreFixture {
  /**
   * 密钥文件存储.
   */
  readonly store: KeyFileStore;
  /**
   * 存储使用的保险库路径.
   */
  readonly paths: VaultPaths;
}

/**
 * 在指定的用户数据目录上创建密钥文件存储.
 * @param directory 用户数据目录.
 * @returns 存储及其路径.
 */
function createStore(directory: string): StoreFixture {
  const paths = resolveVaultPaths(directory);
  return { store: new KeyFileStore(paths), paths };
}

describe("KeyFileStore 读写", () => {
  const getDirectory = useTemporaryDirectory("key-file-store");

  it("文件不存在时读到 undefined", async () => {
    const { store } = createStore(getDirectory());

    expect(await store.read()).toBeUndefined();
  });

  it("写入时创建保险库目录, 读回同样的内容", async () => {
    const { store } = createStore(getDirectory());

    await store.write(RECORD);

    expect(await store.read()).toEqual(RECORD);
  });

  it("再次写入覆盖旧内容, 不留下临时文件", async () => {
    const { store, paths } = createStore(getDirectory());
    const updated: KeyRecord = { ...RECORD, wrappedDataKey: "AAECAwQFBgc=" };
    await store.write(RECORD);

    await store.write(updated);

    expect(await store.read()).toEqual(updated);
    expect(await readdir(paths.directory)).toEqual(["vault-key.json"]);
  });
});

describe("KeyFileStore 读到损坏的文件", () => {
  const getDirectory = useTemporaryDirectory("key-file-store");

  it("文件内容不是合法的 JSON 时抛出", async () => {
    const { store, paths } = createStore(getDirectory());
    await store.write(RECORD);
    await writeFile(paths.keyFile, "{not json", "utf8");

    await expect(store.read()).rejects.toBeInstanceOf(InvalidKeyRecordError);
  });

  it("文件结构不合法时抛出", async () => {
    const { store, paths } = createStore(getDirectory());
    await store.write(RECORD);
    await writeFile(paths.keyFile, JSON.stringify({ version: 1 }), "utf8");

    await expect(store.read()).rejects.toBeInstanceOf(InvalidKeyRecordError);
  });
});
