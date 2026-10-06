import { readFile, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { snapshotDatabase } from "../testing/database-snapshot";
import {
  createRestoreFixture,
  createStageRecorder,
  encryptBytes,
  prepareChosenBackup,
  SAMPLE_BACKUP_PASSPHRASE,
  useRestoreDatabases,
  writeBackupBytes,
  type RestoreDatabases,
  type RestoreFixture,
} from "../testing/restore-fixture";
import { loadSampleBackup, toZipFiles } from "../testing/restore-sample-backup";
import { writeZip } from "../testing/zip-test-writer";
import { NODE_RESTORE_FILE } from "./node-restore-file-system";

/**
 * 选择了加密备份, 服务停在等待口令.
 */
interface ChosenEncryptedBackup {
  /**
   * 恢复服务的测试环境.
   */
  readonly fixture: RestoreFixture;
  /**
   * 加密备份文件的路径.
   */
  readonly path: string;
}

/**
 * 准备一个口令加密的备份, 让对话框选中并选择它, 服务停在等待口令.
 * @param databases 来源库, 目标库与目录.
 * @returns 恢复服务的测试环境与加密备份文件的路径.
 */
async function chooseEncryptedBackup(
  databases: RestoreDatabases,
): Promise<ChosenEncryptedBackup> {
  const fixture = createRestoreFixture(() => databases.getTarget().orm);
  const path = await prepareChosenBackup(fixture, databases, {
    passphrase: SAMPLE_BACKUP_PASSPHRASE,
  });
  await fixture.service.chooseFile();
  return { fixture, path };
}

describe("恢复服务: 口令不对可以重试", () => {
  const databases = useRestoreDatabases("restore-encrypted-wrong");

  it("口令不对时明确提示并保留所选文件, 重试不限次数", async () => {
    const { fixture } = await chooseEncryptedBackup(databases);
    const before = snapshotDatabase(databases.getTarget().orm);

    for (const wrong of ["wrong one", "wrong two", "wrong three"]) {
      expect(await fixture.service.submitPassphrase(wrong)).toEqual({
        ok: false,
        reason: "wrong-passphrase",
      });
      expect(fixture.session.peek()?.kind).toBe("selected");
    }
    expect(snapshotDatabase(databases.getTarget().orm)).toBe(before);
    expect(fixture.failures).toEqual([]);
  });

  it("用对的口令得到预览, 确认后恢复", async () => {
    const { fixture } = await chooseEncryptedBackup(databases);
    await fixture.service.submitPassphrase("wrong one");

    const ready = await fixture.service.submitPassphrase(
      SAMPLE_BACKUP_PASSPHRASE,
    );

    expect(ready).toMatchObject({
      ok: true,
      value: { status: "ready", preview: { isEncrypted: true } },
    });
    expect(
      await fixture.service.run({ acknowledgesReplace: false }),
    ).toMatchObject({ ok: true, value: { entryCount: 8 } });
  });
});

describe("恢复服务: 没有可提交口令的备份", () => {
  const databases = useRestoreDatabases("restore-encrypted-none");

  it("没有已选的加密备份时提交口令被拒绝", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);

    expect(await fixture.service.submitPassphrase("x")).toEqual({
      ok: false,
      reason: "no-pending-restore",
    });
  });

  it("选的是明文备份时提交口令同样被拒绝", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);
    await fixture.service.chooseFile();

    expect(await fixture.service.submitPassphrase("x")).toEqual({
      ok: false,
      reason: "no-pending-restore",
    });
  });
});

describe("恢复服务: 加密备份损坏或版本更新", () => {
  const databases = useRestoreDatabases("restore-encrypted-damaged");

  it("文件损坏时提示损坏并释放所选文件, 库不变", async () => {
    const { fixture, path } = await chooseEncryptedBackup(databases);
    const bytes = await readFile(path);
    await writeFile(path, bytes.subarray(0, bytes.length - 300));
    const before = snapshotDatabase(databases.getTarget().orm);

    const result = await fixture.service.submitPassphrase(
      SAMPLE_BACKUP_PASSPHRASE,
    );

    expect(result).toEqual({ ok: false, reason: "damaged-file" });
    expect(fixture.session.peek()).toBeUndefined();
    expect(snapshotDatabase(databases.getTarget().orm)).toBe(before);
  });

  it("解密成功但里面的备份版本更新时提示版本不符, 并释放所选文件", async () => {
    const base = await loadSampleBackup(databases.getSource().orm);
    base.manifest.version = 2;
    const zip = writeZip(toZipFiles(base));
    const encrypted = await encryptBytes(zip, SAMPLE_BACKUP_PASSPHRASE);
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const directory = databases.getDirectory();
    fixture.state.chosenPath = await writeBackupBytes(
      directory,
      "v2.age",
      encrypted,
    );
    await fixture.service.chooseFile();

    const result = await fixture.service.submitPassphrase(
      SAMPLE_BACKUP_PASSPHRASE,
    );

    expect(result).toEqual({ ok: false, reason: "newer-version" });
    expect(fixture.session.peek()).toBeUndefined();
  });
});

describe("恢复服务: 解密时的进度", () => {
  const databases = useRestoreDatabases("restore-encrypted-progress");

  it("解密时进度处于解密阶段, 结束后回到空闲", async () => {
    const recorder = createStageRecorder();
    const file = {
      ...NODE_RESTORE_FILE,
      openStream: (path: string) => {
        recorder.record();
        return NODE_RESTORE_FILE.openStream(path);
      },
    };
    const fixture = createRestoreFixture(() => databases.getTarget().orm, {
      file,
    });
    recorder.attach(fixture.service);
    await prepareChosenBackup(fixture, databases, {
      passphrase: SAMPLE_BACKUP_PASSPHRASE,
    });
    await fixture.service.chooseFile();

    await fixture.service.submitPassphrase(SAMPLE_BACKUP_PASSPHRASE);

    expect(recorder.stages).toEqual(["decrypting"]);
    expect(fixture.service.getProgress().stage).toBe("idle");
  });
});
