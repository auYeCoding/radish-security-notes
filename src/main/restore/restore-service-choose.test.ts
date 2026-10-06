import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_RESTORE_LIMITS } from "@shared/restore/restore-limits";

import { snapshotDatabase } from "../testing/database-snapshot";
import {
  createRestoreFixture,
  prepareChosenBackup,
  SAMPLE_BACKUP_PASSPHRASE,
  useRestoreDatabases,
  writeBackupBytes,
} from "../testing/restore-fixture";
import { NODE_RESTORE_FILE } from "./node-restore-file-system";
import type { RestoreFilePort } from "./restore-ports";

/**
 * 让读取文件状态停在门前的文件系统能力, 与放行读取的函数.
 */
interface GatedFile {
  /**
   * 文件系统能力, 读取文件状态要等门打开.
   */
  readonly file: RestoreFilePort;
  /**
   * 打开门.
   */
  readonly open: () => void;
}

/**
 * 创建一个让读取文件状态停在门前的文件系统能力.
 * @returns 文件系统能力与放行读取的函数.
 */
function createGatedFile(): GatedFile {
  let open: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  const statFile: RestoreFilePort["statFile"] = async (path) => {
    await gate;
    return NODE_RESTORE_FILE.statFile(path);
  };
  return { file: { ...NODE_RESTORE_FILE, statFile }, open };
}

describe("恢复服务: 取消对话框与不是备份文件", () => {
  const databases = useRestoreDatabases("restore-choose-cancel");

  it("用户取消对话框时没有任何改动, 对话框带标题, 过滤器名称与扩展名", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const before = snapshotDatabase(databases.getTarget().orm);

    const result = await fixture.service.chooseFile();

    expect(result).toEqual({ ok: true, value: { status: "cancelled" } });
    expect(fixture.dialogRequests).toEqual([
      {
        title: "restore.dialog.openTitle",
        defaultDirectory: "default-directory",
        filterName: "restore.dialog.filter",
        extensions: ["zip", "age"],
      },
    ]);
    expect(snapshotDatabase(databases.getTarget().orm)).toBe(before);
  });

  it("不是备份文件, 空文件与 ASCII 外壳的 age 文件都提示不是本应用的备份文件", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const samples = [
      "just some text",
      "",
      "-----BEGIN AGE ENCRYPTED FILE-----\n",
    ];

    for (const text of samples) {
      const name = "other.zip";
      const bytes = Buffer.from(text);
      fixture.state.chosenPath = await writeBackupBytes(
        databases.getDirectory(),
        name,
        bytes,
      );

      expect(await fixture.service.chooseFile()).toEqual({
        ok: false,
        reason: "not-a-backup",
      });
      expect(fixture.session.peek()).toBeUndefined();
    }
    expect(fixture.failures).toEqual([]);
  });
});

describe("恢复服务: 读不了与超过大小上限", () => {
  const databases = useRestoreDatabases("restore-choose-unreadable");

  it("目录与不存在的路径读不了", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const directory = join(databases.getDirectory(), "folder.zip");
    await mkdir(directory);

    for (const path of [
      directory,
      join(databases.getDirectory(), "none.zip"),
    ]) {
      fixture.state.chosenPath = path;

      expect(await fixture.service.chooseFile()).toEqual({
        ok: false,
        reason: "file-unreadable",
      });
    }
    expect(fixture.failures).toEqual([]);
  });

  it("文件超过大小上限时在读取内容之前就拒绝", async () => {
    const limits = { ...DEFAULT_RESTORE_LIMITS, maxFileBytes: 10 };
    const fixture = createRestoreFixture(() => databases.getTarget().orm, {
      limits,
    });
    const bytes = Buffer.from("PK\u0003\u0004 more than ten bytes");
    fixture.state.chosenPath = await writeBackupBytes(
      databases.getDirectory(),
      "big.zip",
      bytes,
    );

    expect(await fixture.service.chooseFile()).toEqual({
      ok: false,
      reason: "file-too-large",
    });
  });
});

describe("恢复服务: 按文件内容识别种类", () => {
  const databases = useRestoreDatabases("restore-choose-kind");

  it("扩展名不对的压缩包照样读取, 不看扩展名", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const generated = await prepareChosenBackup(fixture, databases);
    const bytes = await readFile(generated);
    const dir = databases.getDirectory();
    fixture.state.chosenPath = await writeBackupBytes(
      dir,
      "renamed.txt",
      bytes,
    );

    expect(await fixture.service.chooseFile()).toMatchObject({
      ok: true,
      value: { status: "ready" },
    });
  });

  it("加密的备份只返回需要口令与文件大小, 把所选文件留在会话里", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases, {
      passphrase: SAMPLE_BACKUP_PASSPHRASE,
    });

    const result = await fixture.service.chooseFile();

    expect(result.ok && Object.keys(result.value).sort()).toEqual([
      "fileSizeBytes",
      "status",
    ]);
    expect(fixture.session.peek()?.kind).toBe("selected");
  });
});

describe("恢复服务: 未解锁与重新选择", () => {
  const databases = useRestoreDatabases("restore-choose-locked");

  it("保险库未解锁时拒绝, 备份不留在会话里", async () => {
    const fixture = createRestoreFixture(() => undefined);
    await prepareChosenBackup(fixture, databases);

    expect(await fixture.service.chooseFile()).toEqual({
      ok: false,
      reason: "vault-locked",
    });
    expect(fixture.session.peek()).toBeUndefined();
  });

  it("再次选择会释放上一次等待确认的备份", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);
    await fixture.service.chooseFile();
    expect(fixture.session.peek()?.kind).toBe("pending");

    fixture.state.chosenPath = undefined;
    await fixture.service.chooseFile();

    expect(fixture.session.peek()).toBeUndefined();
  });
});

describe("恢复服务: 忙碌与读取过程中取消", () => {
  const databases = useRestoreDatabases("restore-choose-busy");

  it("一次选择还没结束时, 再选择或提交口令都返回忙碌", async () => {
    const { file, open } = createGatedFile();
    const fixture = createRestoreFixture(() => databases.getTarget().orm, {
      file,
    });
    await prepareChosenBackup(fixture, databases);
    const first = fixture.service.chooseFile();
    await Promise.resolve();

    const busy = { ok: false, reason: "busy" };
    expect(await fixture.service.chooseFile()).toEqual(busy);
    expect(await fixture.service.submitPassphrase("x")).toEqual(busy);
    open();

    expect(await first).toMatchObject({ ok: true, value: { status: "ready" } });
  });

  it("读取过程中取消, 读完的备份不会留在会话里", async () => {
    const { file, open } = createGatedFile();
    const fixture = createRestoreFixture(() => databases.getTarget().orm, {
      file,
    });
    await prepareChosenBackup(fixture, databases);
    const pending = fixture.service.chooseFile();
    await Promise.resolve();

    fixture.service.cancel();
    open();
    const result = await pending;

    expect(result.ok && "preview" in result.value).toBe(false);
    expect(fixture.session.peek()).toBeUndefined();
  });
});

describe("恢复服务: 取消与超时释放等待确认的备份", () => {
  const databases = useRestoreDatabases("restore-choose-release");

  it("没有进行中的操作时取消会释放会话里等待确认的备份", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);
    await fixture.service.chooseFile();

    fixture.service.cancel();

    expect(fixture.session.peek()).toBeUndefined();
    expect(await fixture.service.run({ acknowledgesReplace: false })).toEqual({
      ok: false,
      reason: "no-pending-restore",
    });
  });

  it("等待确认的备份超时后自动释放", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);
    await fixture.service.chooseFile();

    fixture.expireSession();

    expect(fixture.session.peek()).toBeUndefined();
    expect(await fixture.service.run({ acknowledgesReplace: false })).toEqual({
      ok: false,
      reason: "no-pending-restore",
    });
  });
});
