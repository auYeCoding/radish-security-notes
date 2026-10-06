import { describe, expect, it } from "vitest";

import { findEntry } from "../entries/entry-repository";
import { snapshotDatabase } from "../testing/database-snapshot";
import {
  LEGACY_IDS,
  LEGACY_LAST_RESULT_TIME,
  readLastResultTime,
  seedLegacyVaultContent,
} from "../testing/restore-legacy-data";
import {
  createRestoreFixture,
  createStageRecorder,
  prepareChosenBackup,
  SAMPLE_RESTORE_MASTER_PASSWORD,
  useRestoreDatabases,
  type RestoreDatabases,
  type RestoreFixture,
  type RestoreFixtureOptions,
} from "../testing/restore-fixture";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { NODE_RESTORE_FILE } from "./node-restore-file-system";

/**
 * 备份样例并选择它, 得到预览, 服务停在等待确认.
 * @param databases 来源库, 目标库与目录.
 * @param getOrm 取恢复目标库的函数, 默认是目标库.
 * @param options 测试环境的其它选项.
 * @returns 恢复服务的测试环境.
 */
async function chooseSample(
  databases: RestoreDatabases,
  getOrm: () => VaultOrm | undefined = () => databases.getTarget().orm,
  options: RestoreFixtureOptions = {},
): Promise<RestoreFixture> {
  const fixture = createRestoreFixture(getOrm, options);
  await prepareChosenBackup(fixture, databases);
  await fixture.service.chooseFile();
  return fixture;
}

describe("恢复服务: 没有等待确认的备份", () => {
  const databases = useRestoreDatabases("restore-run-none");

  it("没有等待确认的备份时拒绝, 库不变", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const before = snapshotDatabase(databases.getTarget().orm);

    expect(await fixture.service.run({ acknowledgesReplace: true })).toEqual({
      ok: false,
      reason: "no-pending-restore",
    });
    expect(snapshotDatabase(databases.getTarget().orm)).toBe(before);
  });

  it("恢复成功后释放备份, 不能重复恢复", async () => {
    const fixture = await chooseSample(databases);
    await fixture.service.run({ acknowledgesReplace: false });

    expect(fixture.session.peek()).toBeUndefined();
    expect(await fixture.service.run({ acknowledgesReplace: false })).toEqual({
      ok: false,
      reason: "no-pending-restore",
    });
  });
});

describe("恢复服务: 恢复前重输主密码", () => {
  const databases = useRestoreDatabases("restore-run-master");

  it("设了主密码时没给或给错都拒绝并保留备份, 库不变, 给对了才恢复", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    fixture.state.hasMasterPassword = true;
    await prepareChosenBackup(fixture, databases);
    const chosen = await fixture.service.chooseFile();
    const before = snapshotDatabase(databases.getTarget().orm);

    expect(chosen).toMatchObject({
      value: { preview: { requiresMasterPassword: true } },
    });
    for (const masterPassword of [undefined, "not the password"]) {
      expect(
        await fixture.service.run({
          acknowledgesReplace: false,
          masterPassword,
        }),
      ).toEqual({ ok: false, reason: "wrong-master-password" });
      expect(fixture.session.peek()?.kind).toBe("pending");
    }
    expect(snapshotDatabase(databases.getTarget().orm)).toBe(before);
    expect(
      await fixture.service.run({
        acknowledgesReplace: false,
        masterPassword: SAMPLE_RESTORE_MASTER_PASSWORD,
      }),
    ).toMatchObject({ ok: true, value: { entryCount: 8 } });
  });

  it("没设主密码时不要求主密码, 给了也不影响", async () => {
    const fixture = await chooseSample(databases);

    const request = { acknowledgesReplace: false, masterPassword: "ignored" };

    expect(await fixture.service.run(request)).toMatchObject({ ok: true });
  });
});

describe("恢复服务: 非空保险库只允许清空后整体替换", () => {
  const databases = useRestoreDatabases("restore-run-replace");

  it("预览告知现有内容, 没确认替换时拒绝并保留备份, 库不变", async () => {
    seedLegacyVaultContent(databases.getTarget().orm);
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);
    const chosen = await fixture.service.chooseFile();
    const before = snapshotDatabase(databases.getTarget().orm);

    expect(chosen).toMatchObject({
      value: {
        preview: { vault: { isEmpty: false, entryCount: 1, tagCount: 1 } },
      },
    });
    expect(await fixture.service.run({ acknowledgesReplace: false })).toEqual({
      ok: false,
      reason: "replace-not-acknowledged",
    });
    expect(snapshotDatabase(databases.getTarget().orm)).toBe(before);
    expect(fixture.session.peek()?.kind).toBe("pending");
  });

  it("确认后整体替换, 结果与备份前一致, 不属于备份的表不动", async () => {
    seedLegacyVaultContent(databases.getTarget().orm);
    const fixture = await chooseSample(databases);

    const replaced = await fixture.service.run({ acknowledgesReplace: true });

    const options = { ignoreLabelCreatedAt: true };
    const target = databases.getTarget().orm;
    expect(replaced).toMatchObject({
      ok: true,
      value: { entryCount: 8, replacedExistingData: true },
    });
    expect(findEntry(target, LEGACY_IDS.entry)).toBeUndefined();
    expect(readLastResultTime(target)).toBe(LEGACY_LAST_RESULT_TIME);
    expect(snapshotDatabase(target, options)).toBe(
      snapshotDatabase(databases.getSource().orm, options),
    );
  });
});

describe("恢复服务: 数据库出错与保险库被锁定", () => {
  const databases = useRestoreDatabases("restore-run-database");

  it("写入时出错: 意外失败, 只把错误交给失败回调, 释放备份, 库不变", async () => {
    let isBroken = false;
    const fixture = await chooseSample(databases, () =>
      isBroken
        ? explodingOrm(databases.getTarget().orm)
        : databases.getTarget().orm,
    );
    const before = snapshotDatabase(databases.getTarget().orm);
    isBroken = true;

    const result = await fixture.service.run({ acknowledgesReplace: false });

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(fixture.failures).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("secret detail");
    expect(fixture.session.peek()).toBeUndefined();
    expect(snapshotDatabase(databases.getTarget().orm)).toBe(before);
  });

  it("确认前保险库被锁定时拒绝, 备份仍保留等重新解锁", async () => {
    let isLocked = false;
    const getOrm = (): VaultOrm | undefined =>
      isLocked ? undefined : databases.getTarget().orm;
    const fixture = await chooseSample(databases, getOrm);
    isLocked = true;

    expect(await fixture.service.run({ acknowledgesReplace: false })).toEqual({
      ok: false,
      reason: "vault-locked",
    });
    isLocked = false;
    expect(
      await fixture.service.run({ acknowledgesReplace: false }),
    ).toMatchObject({ ok: true });
  });
});

describe("恢复服务: 忙碌与进度", () => {
  const databases = useRestoreDatabases("restore-run-busy");

  it("一次恢复还在复核主密码时, 再确认, 再选择与再提交口令都返回忙碌", async () => {
    const fixture = await chooseSample(databases);
    let open: () => void = () => undefined;
    fixture.state.verifierGate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const first = fixture.service.run({ acknowledgesReplace: false });
    await Promise.resolve();

    const busy = { ok: false, reason: "busy" };
    expect(await fixture.service.run({ acknowledgesReplace: false })).toEqual(
      busy,
    );
    expect(await fixture.service.chooseFile()).toEqual(busy);
    expect(await fixture.service.submitPassphrase("x")).toEqual(busy);
    open();

    expect(await first).toMatchObject({ ok: true, value: { entryCount: 8 } });
  });

  it("选择文件时进度处于读取阶段, 写库时处于写入阶段, 结束后回到空闲", async () => {
    const recorder = createStageRecorder();
    const statFile: typeof NODE_RESTORE_FILE.statFile = (path) => {
      recorder.record();
      return NODE_RESTORE_FILE.statFile(path);
    };
    const now = (): number => {
      recorder.record();
      return 1;
    };
    const fixture = createRestoreFixture(() => databases.getTarget().orm, {
      file: { ...NODE_RESTORE_FILE, statFile },
      now,
    });
    recorder.attach(fixture.service);
    await prepareChosenBackup(fixture, databases);
    await fixture.service.chooseFile();

    await fixture.service.run({ acknowledgesReplace: false });

    expect(recorder.stages).toEqual(["reading", "writing"]);
    expect(fixture.service.getProgress().stage).toBe("idle");
  });
});

/**
 * 包一层数据库查询入口: 开事务时抛出带 "secret detail" 的错误, 模拟数据库在写入时出错.
 * @param orm 真实的数据库查询入口.
 * @returns 开事务就抛错的查询入口.
 */
function explodingOrm(orm: VaultOrm): VaultOrm {
  return new Proxy(orm, {
    get: (target, property) =>
      property === "transaction"
        ? () => {
            throw new Error("database exploded: secret detail");
          }
        : Reflect.get(target, property, target),
  });
}
