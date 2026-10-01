import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveVaultPaths } from "./vault-paths";

describe("resolveVaultPaths", () => {
  it("保险库目录是用户数据目录下独立的 vault 子目录", () => {
    const paths = resolveVaultPaths(join("data", "app"));

    expect(paths.directory).toBe(join("data", "app", "vault"));
    expect(paths.databaseFile).toBe(join("data", "app", "vault", "vault.db"));
    expect(paths.keyFile).toBe(join("data", "app", "vault", "vault-key.json"));
  });
});
