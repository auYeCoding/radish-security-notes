import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { openEncryptedDatabase } from "./open-encrypted-database";

/**
 * SQLite 的 `temp_store` 取值: 2 表示临时数据只放内存.
 */
const TEMP_STORE_MEMORY_VALUE = 2;

describe("openEncryptedDatabase 临时数据", () => {
  const getDirectory = useTemporaryDirectory("encrypted-database");

  it("临时数据只放内存, 不把溢出的排序数据明文写进系统临时目录", () => {
    const client = openEncryptedDatabase(
      join(getDirectory(), "vault.db"),
      randomBytes(32),
    );

    const tempStore = client.pragma("temp_store", { simple: true });
    client.close();

    expect(tempStore).toBe(TEMP_STORE_MEMORY_VALUE);
  });
});
