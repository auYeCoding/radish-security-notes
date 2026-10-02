import { randomBytes } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  NEW_MASTER_PASSWORD,
  prepareVaultWithProbe,
} from "../testing/recovery-vault-fixtures";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import {
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";
import { fileExists } from "./file-exists";
import {
  dataKeyToRecoveryWords,
  recoveryWordsToDataKey,
} from "./recovery-phrase";

describe("VaultService 恢复词被拒绝", () => {
  const getHarness = useVaultServiceHarness();

  it("词不在词表时指出第几个词, 状态与密钥文件不变", async () => {
    const harness = getHarness();
    const words = [
      ...(await prepareVaultWithProbe(harness, "master-password")),
    ];
    words[4] = "notaword";
    const recordBefore = await harness.keyFileStore.read();
    const service = await startService(harness);

    const result = await service.restoreWithMasterPassword(
      words,
      NEW_MASTER_PASSWORD,
    );

    expect(result).toEqual({
      ok: false,
      reason: "recovery-unknown-word",
      wordPosition: 5,
    });
    expect(service.getStatus()).toBe("locked");
    expect(await harness.keyFileStore.read()).toEqual(recordBefore);
  });

  it("词数不对, 校验和不对时分别给出原因", async () => {
    const harness = getHarness();
    const words = [
      ...(await prepareVaultWithProbe(harness, "master-password")),
    ];
    const service = await startService(harness);
    const swapped = [...words];
    [swapped[0], swapped[1]] = [words[1], words[0]];

    expect(await service.verifyRecoveryWords(words.slice(1))).toEqual({
      ok: false,
      reason: "recovery-word-count",
    });
    expect(await service.verifyRecoveryWords(swapped)).toEqual({
      ok: false,
      reason: "recovery-checksum",
    });
  });
});

describe("VaultService 恢复被数据库与新密码拒绝", () => {
  const getHarness = useVaultServiceHarness();

  it("词合法但不是这个保险库的, 数据库打不开, 不接受", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const recordBefore = await harness.keyFileStore.read();
    const service = await startService(harness);
    const otherWords = dataKeyToRecoveryWords(randomBytes(32));

    const result = await service.restoreWithMasterPassword(
      otherWords,
      NEW_MASTER_PASSWORD,
    );

    expect(result).toEqual({ ok: false, reason: "recovery-key-rejected" });
    expect(service.getStatus()).toBe("locked");
    expect(await harness.keyFileStore.read()).toEqual(recordBefore);
  });

  it("新主密码太短时不接受, 密钥文件不变", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const recordBefore = await harness.keyFileStore.read();
    const service = await startService(harness);

    const result = await service.restoreWithMasterPassword(words, "short");

    expect(result).toEqual({ ok: false, reason: "password-too-short" });
    expect(service.getStatus()).toBe("locked");
    expect(await harness.keyFileStore.read()).toEqual(recordBefore);
  });
});

describe("VaultService 恢复的其它拒绝情形", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库文件缺失时不接受任何词, 也不创建新库", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    await rm(harness.paths.databaseFile);
    const service = await startService(harness);

    const result = await service.restoreWithMasterPassword(
      words,
      NEW_MASTER_PASSWORD,
    );

    expect(result).toEqual({ ok: false, reason: "recovery-key-rejected" });
    expect(await fileExists(harness.paths.databaseFile)).toBe(false);
  });

  it("系统不能保护时改用系统保护被拒绝, 密钥文件不变", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const recordBefore = await harness.keyFileStore.read();
    const service = await startService(harness, {
      safeStorage: createFakeSafeStorage({ isAvailable: false }),
    });

    const result = await service.restoreWithoutMasterPassword(words);

    expect(result).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
    expect(await harness.keyFileStore.read()).toEqual(recordBefore);
  });

  it("没有设置过, 或已经解锁时不能恢复", async () => {
    const harness = getHarness();
    const fresh = await startService(harness);
    const words = dataKeyToRecoveryWords(randomBytes(32));

    expect(await fresh.verifyRecoveryWords(words)).toEqual({
      ok: false,
      reason: "unexpected-state",
    });
    await fresh.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    expect(await fresh.restoreWithoutMasterPassword(words)).toEqual({
      ok: false,
      reason: "unexpected-state",
    });
  });
});

describe("VaultService 恢复后磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("保险库目录只有密钥文件与数据库, 内容里没有词, 数据密钥与新主密码", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const dataKey = recoveryWordsToDataKey(words);
    const service = await startService(harness);

    await service.restoreWithMasterPassword(words, NEW_MASTER_PASSWORD);
    const files = await readdir(harness.paths.directory);
    const contents = await Promise.all(
      files.map((file) => readFile(join(harness.paths.directory, file))),
    );

    expect(files.sort()).toEqual(["vault-key.json", "vault.db"]);
    for (const content of contents) {
      expect(content.includes(NEW_MASTER_PASSWORD)).toBe(false);
      expect(content.includes(words.join(" "))).toBe(false);
      expect(content.includes(dataKey)).toBe(false);
      expect(content.includes(dataKey.toString("hex"))).toBe(false);
      expect(content.includes(dataKey.toString("base64"))).toBe(false);
    }
  });
});
