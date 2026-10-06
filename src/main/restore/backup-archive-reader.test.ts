import { describe, expect, it } from "vitest";

import {
  DEFAULT_RESTORE_LIMITS,
  type RestoreLimits,
} from "@shared/restore/restore-limits";
import type { RestoreResult } from "@shared/restore/restore-result";

import { writeBackupBytes } from "../testing/restore-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { writeZip, type ZipTestFile } from "../testing/zip-test-writer";
import { openBackupArchive } from "./backup-archive-opener";
import {
  readBackupArchive,
  type RawBackupArchive,
} from "./backup-archive-reader";
import { BackupDamagedError } from "./restore-errors";

/**
 * 合规的三个文件: 清单, 保险库数据 (deflate) 与一个附件 (仅存储).
 */
const VALID_FILES: readonly ZipTestFile[] = [
  { name: "manifest.json", content: Buffer.from("{}"), method: "deflate" },
  { name: "vault.json", content: Buffer.from("[]"), method: "deflate" },
  { name: "attachments/att-1", content: Buffer.from([1, 2, 3]) },
];

/**
 * 读完一个压缩包的产出.
 */
interface ReadOutcome {
  /**
   * 读取的结果.
   */
  readonly result: RestoreResult<RawBackupArchive>;
  /**
   * 进度报告, 每项是 (已读, 总数).
   */
  readonly progress: [number, number][];
}

/**
 * 打开内存里的压缩包, 读出内容, 读完关闭.
 * @param files 压缩包里的文件.
 * @param limits 读取上限.
 * @returns 读出的结果与进度报告.
 */
async function readFiles(
  files: readonly ZipTestFile[],
  limits: RestoreLimits = DEFAULT_RESTORE_LIMITS,
): Promise<ReadOutcome> {
  const bytes = writeZip(files);
  const zipFile = await openBackupArchive({ kind: "bytes", bytes });
  const progress: [number, number][] = [];
  try {
    const report = (done: number, total: number): number =>
      progress.push([done, total]);
    const result = await readBackupArchive(zipFile, limits, report);
    return { result, progress };
  } finally {
    zipFile.close();
  }
}

/**
 * 在合规文件之后追加一个文件.
 * @param file 追加的文件.
 * @returns 追加后的文件列表.
 */
function withExtra(file: ZipTestFile): ZipTestFile[] {
  return [...VALID_FILES, file];
}

describe("读出备份压缩包: 合规的压缩包", () => {
  const getDirectory = useTemporaryDirectory("backup-archive-reader-ok");

  it("读出清单, 保险库数据与附件内容, 并按文件个数报告进度", async () => {
    const { result, progress } = await readFiles(VALID_FILES);

    expect(result.ok && result.value.manifest.toString()).toBe("{}");
    expect(result.ok && result.value.vault.toString()).toBe("[]");
    expect(result.ok && [...result.value.attachments]).toEqual([
      ["att-1", Buffer.from([1, 2, 3])],
    ]);
    expect(progress).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("磁盘上的文件按路径打开, 读出的内容相同", async () => {
    const bytes = writeZip(VALID_FILES);
    const path = await writeBackupBytes(getDirectory(), "backup.zip", bytes);
    const zipFile = await openBackupArchive({ kind: "path", path });
    const noop = (): void => undefined;

    const result = await readBackupArchive(
      zipFile,
      DEFAULT_RESTORE_LIMITS,
      noop,
    );
    zipFile.close();

    expect(result.ok && result.value.attachments.size).toBe(1);
  });
});

describe("读出备份压缩包: 不合规的名称整体拒绝", () => {
  it("路径穿越, 绝对路径与反斜杠路径整体拒绝, 不读取任何内容", async () => {
    for (const name of ["../evil", "/abs/evil", "attachments\\a", "C:/evil"]) {
      const content = Buffer.from("x");
      const { result, progress } = await readFiles(
        withExtra({ name, content }),
      );

      expect(result).toEqual({
        ok: false,
        reason: "invalid-content",
        problem: { section: "archive", code: "unexpected-file", position: 4 },
      });
      expect(progress).toEqual([]);
    }
  });

  it("重复的路径整体拒绝, 没有清单的压缩包不是本应用的备份文件", async () => {
    const duplicate = withExtra({
      name: "vault.json",
      content: Buffer.from("[1]"),
    });
    const noManifest = [{ name: "readme.txt", content: Buffer.from("hi") }];

    expect((await readFiles(duplicate)).result).toMatchObject({
      problem: { code: "duplicate-file", position: 4 },
    });
    expect((await readFiles(noManifest)).result).toEqual({
      ok: false,
      reason: "not-a-backup",
    });
  });
});

describe("读出备份压缩包: 超过上限整体拒绝", () => {
  it("中央目录声明的文件个数超过上限时, 读任何文件之前就拒绝", async () => {
    const limits = { ...DEFAULT_RESTORE_LIMITS, maxArchiveFiles: 2 };

    const { result, progress } = await readFiles(VALID_FILES, limits);

    expect(result).toEqual({
      ok: false,
      reason: "limit-exceeded",
      problem: { section: "archive", code: "too-many-files" },
    });
    expect(progress).toEqual([]);
  });

  it("声明的字节数超过上限时整体拒绝, 不读取内容", async () => {
    const limits = { ...DEFAULT_RESTORE_LIMITS, maxUncompressedBytes: 4 };

    const { result, progress } = await readFiles(VALID_FILES, limits);

    expect(result).toMatchObject({
      reason: "limit-exceeded",
      problem: { section: "archive", code: "too-large" },
    });
    expect(progress).toEqual([]);
  });
});

describe("读出备份压缩包: 损坏的压缩包", () => {
  it("头部声明的大小与实际不符的文件读取时抛损坏错误", async () => {
    const [manifest, vault, attachment] = VALID_FILES as [
      ZipTestFile,
      ZipTestFile,
      ZipTestFile,
    ];
    const liedVault = [manifest, { ...vault, declaredSize: 1 }];
    const liedAttachment = [
      manifest,
      vault,
      { ...attachment, declaredSize: 9 },
    ];

    for (const files of [liedVault, liedAttachment]) {
      await expect(readFiles(files)).rejects.toBeInstanceOf(BackupDamagedError);
    }
  });

  it("压缩炸弹: 声明很小, 实际解压出远超声明的字节时读取中止", async () => {
    const content = Buffer.alloc(5 * 1024 * 1024);
    const bomb = {
      name: "vault.json",
      content,
      method: "deflate" as const,
      declaredSize: 1000,
    };

    await expect(
      readFiles([VALID_FILES[0] as ZipTestFile, bomb]),
    ).rejects.toBeInstanceOf(BackupDamagedError);
  });

  it("不是压缩包的字节打开时抛损坏错误", async () => {
    const bytes = Buffer.from("PK\u0003\u0004 not a zip");

    await expect(
      openBackupArchive({ kind: "bytes", bytes }),
    ).rejects.toBeInstanceOf(BackupDamagedError);
  });
});
