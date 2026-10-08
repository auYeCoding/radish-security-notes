import { readFile, readdir, rm } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  startService,
  useVaultServiceHarness,
  type VaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { fileExists } from "./file-exists";

/**
 * 另一个测试主密码, 恢复时用它设置新保护.
 */
const RESTORED_MASTER_PASSWORD = "restored-master-password";

/**
 * 完成首次设置后关闭服务, 带回设置时给出的恢复词.
 * @param harness 测试环境.
 * @returns 24 个恢复词.
 */
async function setUpVaultWithRecoveryWords(
  harness: VaultServiceHarness,
): Promise<readonly string[]> {
  const service = await startService(harness);
  const result = await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  service.close();
  if (!result.ok) {
    throw new Error("测试前提不成立: 首次设置应成功");
  }
  return result.recoveryWords;
}

/**
 * 保险库目录里全部文件名与内容的指纹, 用来断言失败路径没有创建, 改动或删除文件.
 * @param harness 测试环境.
 * @returns 文件名与内容的十六进制拼接.
 */
async function fingerprintVaultDirectory(
  harness: VaultServiceHarness,
): Promise<string[]> {
  const names = (await readdir(harness.paths.directory)).sort();
  return Promise.all(
    names.map(
      async (name) =>
        `${name}:${(await readFile(`${harness.paths.directory}/${name}`)).toString("hex")}`,
    ),
  );
}

describe("VaultService 失败信息只在失败状态给出", () => {
  const getHarness = useVaultServiceHarness();

  it("全新, 锁定与解锁状态都没有失败信息", async () => {
    const harness = getHarness();
    const fresh = await startService(harness);
    expect(fresh.getFailure()).toBeUndefined();
    await fresh.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    expect(fresh.getFailure()).toBeUndefined();
    fresh.close();

    const locked = await startService(harness);

    expect(locked.getStatus()).toBe("locked");
    expect(locked.getFailure()).toBeUndefined();
  });

  it("设置阶段意外失败: 进入 failed, 记下 setup 阶段与错误类名", async () => {
    const harness = getHarness();
    const service = await startService(harness);
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValue(
      new TypeError("disk full at C:\\private\\path"),
    );

    const result = await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(service.getFailure()).toEqual({
      cause: "unexpected",
      stage: "setup",
      errorName: "TypeError",
    });
    expect(JSON.stringify(service.getFailure())).not.toContain("private");
  });
});

describe("VaultService 缺数据库文件时的恢复词", () => {
  const getHarness = useVaultServiceHarness();

  it("恢复词被拒绝, 不创建数据库文件, 不改动密钥文件, 仍是缺数据库", async () => {
    const harness = getHarness();
    const words = await setUpVaultWithRecoveryWords(harness);
    await rm(harness.paths.databaseFile);
    const before = await fingerprintVaultDirectory(harness);
    const service = await startService(harness);

    const verified = await service.verifyRecoveryWords(words);
    const restored = await service.restoreWithMasterPassword(
      words,
      RESTORED_MASTER_PASSWORD,
    );

    expect(verified).toEqual({ ok: false, reason: "recovery-key-rejected" });
    expect(restored).toEqual({ ok: false, reason: "recovery-key-rejected" });
    expect(service.getStatus()).toBe("failed");
    expect(service.getFailure()?.cause).toBe("database-missing");
    expect(await fileExists(harness.paths.databaseFile)).toBe(false);
    expect(await fingerprintVaultDirectory(harness)).toEqual(before);
  });
});

describe("VaultService 缺密钥文件时凭恢复词恢复", () => {
  const getHarness = useVaultServiceHarness();

  it("恢复成功后转入已解锁, 失败信息作废", async () => {
    const harness = getHarness();
    const words = await setUpVaultWithRecoveryWords(harness);
    await rm(harness.paths.keyFile);
    const service = await startService(harness);
    expect(service.getFailure()?.cause).toBe("key-file-missing");

    const result = await service.restoreWithMasterPassword(
      words,
      RESTORED_MASTER_PASSWORD,
    );

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    expect(service.getFailure()).toBeUndefined();
  });

  it("恢复阶段意外失败: 记下 restore 阶段", async () => {
    const harness = getHarness();
    const words = await setUpVaultWithRecoveryWords(harness);
    await rm(harness.paths.keyFile);
    const service = await startService(harness);
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValue(
      new RangeError("write failed"),
    );

    const result = await service.restoreWithMasterPassword(
      words,
      RESTORED_MASTER_PASSWORD,
    );

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(service.getFailure()).toEqual({
      cause: "unexpected",
      stage: "restore",
      errorName: "RangeError",
    });
  });
});
