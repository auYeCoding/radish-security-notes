import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { fileExists } from "../file-exists";
import { hasDatabaseContent } from "./database-presence";

describe("hasDatabaseContent", () => {
  const getDirectory = useTemporaryDirectory("database-presence");

  it("文件不存在时为 false, 也不创建文件", async () => {
    const databaseFile = join(getDirectory(), "vault.db");

    expect(await hasDatabaseContent(databaseFile)).toBe(false);
    expect(await fileExists(databaseFile)).toBe(false);
  });

  it("空文件为 false", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    await writeFile(databaseFile, "");

    expect(await hasDatabaseContent(databaseFile)).toBe(false);
  });

  it("有内容的文件为 true", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    await writeFile(databaseFile, "content");

    expect(await hasDatabaseContent(databaseFile)).toBe(true);
  });

  it("所在目录不存在时也是文件不存在, 为 false", async () => {
    const databaseFile = join(getDirectory(), "missing", "vault.db");

    expect(await hasDatabaseContent(databaseFile)).toBe(false);
  });
});
