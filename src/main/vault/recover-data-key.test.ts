import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createSampleEncryptedVault as createSampleVault } from "../testing/sample-encrypted-vault";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { recoverDataKey } from "./recover-data-key";
import { dataKeyToRecoveryWords } from "./recovery-phrase";

describe("recoverDataKey 成功", () => {
  const getDirectory = useTemporaryDirectory("recover-data-key");

  it("正确的词还原出能打开数据库的数据密钥", async () => {
    const { databaseFile, words } = createSampleVault(getDirectory());

    const recovery = await recoverDataKey(words, databaseFile);

    expect(recovery.ok).toBe(true);
    if (recovery.ok) {
      expect(dataKeyToRecoveryWords(recovery.dataKey)).toEqual(words);
    }
  });
});

describe("recoverDataKey 词本身有问题", () => {
  const getDirectory = useTemporaryDirectory("recover-data-key");

  it("词数不对时失败", async () => {
    const { databaseFile, words } = createSampleVault(getDirectory());

    expect(await recoverDataKey(words.slice(0, 23), databaseFile)).toEqual({
      ok: false,
      reason: "recovery-word-count",
    });
  });

  it("词不在词表时失败并带位置", async () => {
    const { databaseFile, words } = createSampleVault(getDirectory());
    words[11] = "notaword";

    expect(await recoverDataKey(words, databaseFile)).toEqual({
      ok: false,
      reason: "recovery-unknown-word",
      wordPosition: 12,
    });
  });

  it("校验和不通过时失败", async () => {
    const { databaseFile, words } = createSampleVault(getDirectory());
    const swapped = [...words];
    [swapped[0], swapped[1]] = [words[1], words[0]];

    const recovery = await recoverDataKey(swapped, databaseFile);

    expect(recovery.ok).toBe(false);
    expect(recovery).not.toHaveProperty("dataKey");
  });
});

describe("recoverDataKey 数据库拒绝", () => {
  const getDirectory = useTemporaryDirectory("recover-data-key");

  it("校验和通过但数据库打不开时失败", async () => {
    const { databaseFile } = createSampleVault(getDirectory());
    const otherWords = dataKeyToRecoveryWords(randomBytes(32));

    expect(await recoverDataKey(otherWords, databaseFile)).toEqual({
      ok: false,
      reason: "recovery-key-rejected",
    });
  });

  it("数据库文件不存在时失败", async () => {
    const words = dataKeyToRecoveryWords(randomBytes(32));

    expect(
      await recoverDataKey(words, join(getDirectory(), "missing.db")),
    ).toEqual({ ok: false, reason: "recovery-key-rejected" });
  });
});
