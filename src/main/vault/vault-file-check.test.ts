import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import { detectVaultFileProblem } from "./vault-file-check";
import { resolveVaultPaths, type VaultPaths } from "./vault-paths";

describe("detectVaultFileProblem", () => {
  const getDirectory = useTemporaryDirectory("vault-file-check");

  const prepareVaultDirectory = async (): Promise<VaultPaths> => {
    const paths = resolveVaultPaths(getDirectory());
    await mkdir(paths.directory, { recursive: true });
    return paths;
  };

  it("两个文件都没有是全新目录, 不算问题", async () => {
    const paths = await prepareVaultDirectory();

    expect(await detectVaultFileProblem(paths, false)).toBeUndefined();
  });

  it("有数据库文件却没有密钥文件是 key-file-missing", async () => {
    const paths = await prepareVaultDirectory();
    await writeFile(paths.databaseFile, "database");

    expect(await detectVaultFileProblem(paths, false)).toBe("key-file-missing");
  });

  it("空的数据库文件也算存在, 没有密钥文件时仍是 key-file-missing", async () => {
    const paths = await prepareVaultDirectory();
    await writeFile(paths.databaseFile, "");

    expect(await detectVaultFileProblem(paths, false)).toBe("key-file-missing");
  });

  it("有密钥文件却没有数据库文件是 database-missing", async () => {
    const paths = await prepareVaultDirectory();

    expect(await detectVaultFileProblem(paths, true)).toBe("database-missing");
  });

  it("有密钥文件而数据库文件是空文件, 按 database-missing 处理", async () => {
    const paths = await prepareVaultDirectory();
    await writeFile(paths.databaseFile, "");

    expect(await detectVaultFileProblem(paths, true)).toBe("database-missing");
  });

  it("两个文件都在且数据库有内容时对得上", async () => {
    const paths = await prepareVaultDirectory();
    await writeFile(paths.databaseFile, "database");

    expect(await detectVaultFileProblem(paths, true)).toBeUndefined();
  });

  it("检测只读: 不创建, 不改动任何文件", async () => {
    const paths = await prepareVaultDirectory();
    await writeFile(paths.keyFile, "key");
    const filesBefore = await readdir(paths.directory);
    const keyBefore = await readFile(paths.keyFile);

    await detectVaultFileProblem(paths, true);

    expect(await readdir(paths.directory)).toEqual(filesBefore);
    expect(await readFile(paths.keyFile)).toEqual(keyBefore);
  });
});
