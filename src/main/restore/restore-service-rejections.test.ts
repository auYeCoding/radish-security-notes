import { describe, expect, it } from "vitest";

import {
  DEFAULT_RESTORE_LIMITS,
  type RestoreLimits,
} from "@shared/restore/restore-limits";
import type { RestoreResult } from "@shared/restore/restore-result";
import type { RestoreChooseOutcome } from "@shared/restore/restore-types";

import { snapshotDatabase } from "../testing/database-snapshot";
import {
  createRestoreFixture,
  useRestoreDatabases,
  writeBackupBytes,
  type RestoreDatabases,
} from "../testing/restore-fixture";
import {
  cloneSampleBackup,
  loadSampleBackup,
  toZipFiles,
  type SampleBackup,
} from "../testing/restore-sample-backup";
import { writeZip, type ZipTestFile } from "../testing/zip-test-writer";

/**
 * 把压缩包字节写成文件交给恢复服务选择, 并确认库没有变, 失败回调没有被惊动, 会话里没有留下
 * 东西, 不能再确认恢复.
 * @param databases 来源库, 目标库与目录.
 * @param bytes 压缩包字节.
 * @param limits 读取上限.
 * @returns 选择文件的结果.
 */
async function choose(
  databases: RestoreDatabases,
  bytes: Buffer,
  limits: RestoreLimits = DEFAULT_RESTORE_LIMITS,
): Promise<RestoreResult<RestoreChooseOutcome>> {
  const target = databases.getTarget().orm;
  const fixture = createRestoreFixture(() => target, { limits });
  const directory = databases.getDirectory();
  fixture.state.chosenPath = await writeBackupBytes(directory, "b.zip", bytes);
  const before = snapshotDatabase(target);
  const result = await fixture.service.chooseFile();
  expect(snapshotDatabase(target)).toBe(before);
  expect(fixture.failures).toEqual([]);
  expect(fixture.session.peek()).toBeUndefined();
  expect(await fixture.service.run({ acknowledgesReplace: true })).toEqual({
    ok: false,
    reason: "no-pending-restore",
  });
  return result;
}

/**
 * 在合规样本的拷贝上改动后写成压缩包字节.
 * @param base 合规样本.
 * @param mutate 改动函数.
 * @param extraFiles 追加到压缩包末尾的文件.
 * @returns 压缩包字节.
 */
function zipAfter(
  base: SampleBackup,
  mutate: (backup: SampleBackup) => void,
  extraFiles: readonly ZipTestFile[] = [],
): Buffer {
  const backup = cloneSampleBackup(base);
  mutate(backup);
  return writeZip([...toZipFiles(backup), ...extraFiles]);
}

/**
 * 压缩包里多出的一个文件.
 * @param name 路径.
 * @returns 追加文件的列表.
 */
function extraFile(name: string): ZipTestFile[] {
  return [{ name, content: Buffer.from("x") }];
}

describe("恢复服务: 版本与格式不符", () => {
  const databases = useRestoreDatabases("restore-reject-version");

  it("版本更高的备份提示来自更新版本的应用", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const bytes = zipAfter(base, (b) => (b.manifest.version = 2));

    expect(await choose(databases, bytes)).toEqual({
      ok: false,
      reason: "newer-version",
    });
  });

  it("格式标识不符与没有清单的压缩包不是备份文件", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const other = zipAfter(base, (b) => (b.manifest.format = "other-app"));
    const plain = writeZip(extraFile("readme.txt"));

    for (const bytes of [other, plain]) {
      expect(await choose(databases, bytes)).toEqual({
        ok: false,
        reason: "not-a-backup",
      });
    }
  });
});

describe("恢复服务: 内容结构不合规写明第一个原因", () => {
  const databases = useRestoreDatabases("restore-reject-content");

  it("条目引用与清单计数不合规", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const badType = zipAfter(base, (b) => (b.vault.entries[2].type = "nope"));
    const badCount = zipAfter(base, (b) => (b.manifest.counts.entries = 99));

    expect(await choose(databases, badType)).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section: "entries", code: "unknown-reference", position: 3 },
    });
    expect(await choose(databases, badCount)).toMatchObject({
      problem: { section: "manifest", code: "count-mismatch" },
    });
  });

  it("保险库数据不是合法的 JSON", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const files = toZipFiles(base).map((file) =>
      file.name === "vault.json"
        ? { ...file, content: Buffer.from("not json") }
        : file,
    );

    expect(await choose(databases, writeZip(files))).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section: "archive", code: "wrong-shape" },
    });
  });
});

describe("恢复服务: 压缩包里的路径与重复名", () => {
  const databases = useRestoreDatabases("restore-reject-names");

  it("路径穿越, 绝对路径, 反斜杠或不认识的文件整体拒绝", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);

    for (const name of [
      "../evil",
      "/etc/evil",
      "a\\b",
      "C:/evil",
      "extra.txt",
    ]) {
      const bytes = zipAfter(base, () => undefined, extraFile(name));

      expect(await choose(databases, bytes)).toMatchObject({
        reason: "invalid-content",
        problem: { section: "archive", code: "unexpected-file" },
      });
    }
  });

  it("重复的条目名整体拒绝", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const bytes = zipAfter(base, () => undefined, extraFile("vault.json"));

    expect(await choose(databases, bytes)).toMatchObject({
      reason: "invalid-content",
      problem: { section: "archive", code: "duplicate-file" },
    });
  });
});

describe("恢复服务: 超过上限整体拒绝并写明是哪一项", () => {
  const databases = useRestoreDatabases("restore-reject-limits");

  it("文件个数与声明的总字节数", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const bytes = zipAfter(base, () => undefined);
    const files = { ...DEFAULT_RESTORE_LIMITS, maxArchiveFiles: 3 };
    const total = { ...DEFAULT_RESTORE_LIMITS, maxUncompressedBytes: 100 };

    expect(await choose(databases, bytes, files)).toEqual({
      ok: false,
      reason: "limit-exceeded",
      problem: { section: "archive", code: "too-many-files" },
    });
    expect(await choose(databases, bytes, total)).toMatchObject({
      reason: "limit-exceeded",
      problem: { section: "archive", code: "too-large" },
    });
  });

  it("保险库数据文件声明的字节数", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const limits = { ...DEFAULT_RESTORE_LIMITS, maxVaultDocumentBytes: 100 };

    expect(
      await choose(
        databases,
        zipAfter(base, () => undefined),
        limits,
      ),
    ).toMatchObject({
      problem: { section: "archive", code: "too-large", position: 2 },
    });
  });
});

describe("恢复服务: 损坏的压缩包", () => {
  const databases = useRestoreDatabases("restore-reject-damaged");

  it("压缩炸弹与声明和实际大小不符判为损坏", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const content = Buffer.alloc(5 * 1024 * 1024);
    const bomb = writeZip([
      toZipFiles(base)[0] as ZipTestFile,
      { name: "vault.json", content, method: "deflate", declaredSize: 1000 },
    ]);
    const lying = writeZip(
      toZipFiles(base).map((file, index) =>
        index === 1 ? { ...file, declaredSize: 5 } : file,
      ),
    );

    for (const bytes of [bomb, lying]) {
      expect(await choose(databases, bytes)).toEqual({
        ok: false,
        reason: "damaged-file",
      });
    }
  });

  it("被截断的压缩包与不是压缩包的文件判为损坏", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const valid = zipAfter(base, () => undefined);
    const truncated = valid.subarray(0, valid.length - 40);
    const garbage = Buffer.concat([
      Buffer.from("PK\u0003\u0004"),
      Buffer.alloc(200, 7),
    ]);

    for (const bytes of [truncated, garbage]) {
      expect(await choose(databases, bytes)).toEqual({
        ok: false,
        reason: "damaged-file",
      });
    }
  });
});

describe("恢复服务: 拒绝之后可以重新选择", () => {
  const databases = useRestoreDatabases("restore-reject-recover");

  it("拒绝之后再选择一个合规的备份仍然可以正常恢复", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const dir = databases.getDirectory();
    const bad = zipAfter(base, (b) => (b.manifest.version = 2));
    fixture.state.chosenPath = await writeBackupBytes(dir, "bad.zip", bad);
    expect(await fixture.service.chooseFile()).toMatchObject({ ok: false });

    const good = zipAfter(base, () => undefined);
    fixture.state.chosenPath = await writeBackupBytes(dir, "good.zip", good);

    expect(await fixture.service.chooseFile()).toMatchObject({
      ok: true,
      value: { status: "ready" },
    });
    expect(
      await fixture.service.run({ acknowledgesReplace: false }),
    ).toMatchObject({ ok: true, value: { entryCount: 8 } });
  });
});
