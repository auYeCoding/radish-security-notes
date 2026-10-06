import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_RESTORE_LIMITS } from "@shared/restore/restore-limits";

import { writeBackupBytes } from "../testing/restore-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { NODE_RESTORE_FILE } from "./node-restore-file-system";
import { inspectBackupFile } from "./restore-file-inspector";
import type { RestoreFilePort } from "./restore-ports";

/**
 * 压缩包文件开头的字节.
 */
const ZIP_HEAD = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]);

/**
 * age 加密文件开头的字节.
 */
const AGE_HEAD = Buffer.from("age-encryption.org/v1\n-> scrypt x 18\n");

/**
 * 读文件开头总是出错的文件系统能力.
 */
const FAILING_HEAD: RestoreFilePort = {
  ...NODE_RESTORE_FILE,
  readHead: () => Promise.reject(new Error("io error at C:\\secret")),
};

describe("检查用户选定的备份文件: 识别种类", () => {
  const getDirectory = useTemporaryDirectory("restore-inspector-kind");

  it("压缩包按内容识别, 带回文件大小", async () => {
    const path = await writeBackupBytes(getDirectory(), "a.bin", ZIP_HEAD);

    expect(
      await inspectBackupFile(path, NODE_RESTORE_FILE, DEFAULT_RESTORE_LIMITS),
    ).toEqual({ ok: true, value: { kind: "zip", fileSizeBytes: 6 } });
  });

  it("age 加密文件按内容识别", async () => {
    const path = await writeBackupBytes(getDirectory(), "b.bin", AGE_HEAD);

    expect(
      await inspectBackupFile(path, NODE_RESTORE_FILE, DEFAULT_RESTORE_LIMITS),
    ).toMatchObject({ ok: true, value: { kind: "encrypted" } });
  });
});

describe("检查用户选定的备份文件: 读不了与拒绝", () => {
  const getDirectory = useTemporaryDirectory("restore-inspector-reject");

  it("目录, 不存在的路径与读取出错都是读不了", async () => {
    const directory = join(getDirectory(), "dir");
    await mkdir(directory);
    const file = await writeBackupBytes(getDirectory(), "c.bin", ZIP_HEAD);
    const cases: [string, RestoreFilePort][] = [
      [directory, NODE_RESTORE_FILE],
      [join(getDirectory(), "missing"), NODE_RESTORE_FILE],
      [file, FAILING_HEAD],
    ];

    for (const [path, port] of cases) {
      expect(
        await inspectBackupFile(path, port, DEFAULT_RESTORE_LIMITS),
      ).toEqual({ ok: false, reason: "file-unreadable" });
    }
  });

  it("超过大小上限, 或开头不是备份魔数时拒绝", async () => {
    const big = await writeBackupBytes(getDirectory(), "d.bin", ZIP_HEAD);
    const other = await writeBackupBytes(
      getDirectory(),
      "e.bin",
      Buffer.from("hello"),
    );
    const small = { ...DEFAULT_RESTORE_LIMITS, maxFileBytes: 5 };

    expect(await inspectBackupFile(big, NODE_RESTORE_FILE, small)).toEqual({
      ok: false,
      reason: "file-too-large",
    });
    expect(
      await inspectBackupFile(other, NODE_RESTORE_FILE, DEFAULT_RESTORE_LIMITS),
    ).toEqual({ ok: false, reason: "not-a-backup" });
  });
});
