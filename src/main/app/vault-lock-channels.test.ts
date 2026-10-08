import { describe, expect, it, vi } from "vitest";

import { bitwardenExport, bitwardenLogin } from "../testing/bitwarden-sample";
import { createAttachmentServiceFixture } from "../testing/attachment-service-fixture";
import { createBatchServiceFixture } from "../testing/batch-service-fixture";
import { createCustomEntryTypeFixture } from "../testing/custom-entry-type-fixture";
import {
  createEmailBackupFixture,
  savedSettingsInput,
} from "../testing/email-backup-fixture";
import { RUN_WITH_ATTACHMENTS } from "../testing/email-backup-test-helpers";
import { createEntryServiceFixture } from "../testing/entry-service-fixture";
import {
  createExportServiceFixture,
  exportRequestOf,
} from "../testing/export-service-fixture";
import { createFolderServiceFixture } from "../testing/folder-service-fixture";
import {
  SAMPLE_SOURCE_PATH,
  createImportServiceFixture,
  type ImportServiceFixture,
} from "../testing/import-service-fixture";
import {
  createRestoreFixture,
  prepareChosenBackup,
  useRestoreDatabases,
  type RestoreDatabases,
  type RestoreFixture,
} from "../testing/restore-fixture";
import { createTagServiceFixture } from "../testing/tag-service-fixture";
import { createTotpServiceFixture } from "../testing/totp-service-fixture";
import {
  startService,
  useVaultServiceHarness,
  type VaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { createLockRegistry } from "../vault/lock-registry";
import type { VaultService } from "../vault/vault-service";
import { registerLockParticipants } from "./register-lock-participants";

/**
 * 保险库已锁定时各业务服务给出的统一拒绝.
 */
const LOCKED = { ok: false, reason: "vault-locked" };

/**
 * 登记进锁定登记处的真实服务与它们的测试环境.
 */
interface WiredVault {
  /**
   * 已解锁的保险库服务.
   */
  readonly vault: VaultService;
  /**
   * 导入服务的测试环境.
   */
  readonly importFixture: ImportServiceFixture;
  /**
   * 恢复服务的测试环境.
   */
  readonly restoreFixture: RestoreFixture;
  /**
   * 锁定时被调用的自动备份暂停间谍.
   */
  readonly pauseAutoBackupUntilUnlocked: ReturnType<typeof vi.fn>;
}

/**
 * 用主密码设置并解锁一个保险库.
 * @param getHarness 取当前保险库服务测试环境的函数.
 * @param lockRegistry 锁定登记处.
 * @returns 已解锁的保险库服务.
 */
async function startMasterPasswordVault(
  getHarness: () => VaultServiceHarness,
  lockRegistry = createLockRegistry(),
): Promise<VaultService> {
  const vault = await startService(getHarness(), { lockRegistry });
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return vault;
}

/**
 * 创建已解锁的保险库, 并把真实的导入, 导出, 恢复, 邮箱备份服务登记进它的锁定登记处, 与应用
 * 启动时的装配一致.
 * @param getHarness 取当前保险库服务测试环境的函数.
 * @param databases 恢复测试的库与目录, 邮箱备份的临时目录取自它.
 * @returns 保险库与导入, 恢复的测试环境.
 */
async function startWiredVault(
  getHarness: () => VaultServiceHarness,
  databases: RestoreDatabases,
): Promise<WiredVault> {
  const lockRegistry = createLockRegistry();
  const vault = await startMasterPasswordVault(getHarness, lockRegistry);
  const getOrm = (): ReturnType<VaultService["getOrm"]> => vault.getOrm();
  const importFixture = createImportServiceFixture(getOrm);
  const restoreFixture = createRestoreFixture(getOrm);
  const pauseAutoBackupUntilUnlocked = vi.fn();
  registerLockParticipants(lockRegistry, {
    importService: importFixture.service,
    exportService: createExportServiceFixture(getOrm).service,
    restoreService: restoreFixture.service,
    emailBackupService: createEmailBackupFixture(
      getOrm,
      databases.getDirectory(),
    ).service,
    pauseAutoBackupUntilUnlocked,
  });
  return { vault, importFixture, restoreFixture, pauseAutoBackupUntilUnlocked };
}

describe("锁定后各业务服务统一拒绝", () => {
  const getHarness = useVaultServiceHarness();

  it("条目, 文件夹, 标签, 批量, 自定义类型, TOTP, 附件: 锁定前可用, 锁定后一律 vault-locked", async () => {
    const vault = await startMasterPasswordVault(getHarness);
    const { entries } = createEntryServiceFixture(vault);
    const { folders } = createFolderServiceFixture(vault);
    const { tags } = createTagServiceFixture(vault);
    const { batch } = createBatchServiceFixture(vault);
    const { customTypes } = createCustomEntryTypeFixture(vault);
    const { totp } = createTotpServiceFixture(vault);
    const { attachments } = createAttachmentServiceFixture(vault);
    expect(entries.list().ok).toBe(true);
    expect(folders.list().ok).toBe(true);
    expect(tags.list().ok).toBe(true);
    expect(customTypes.list().ok).toBe(true);

    await vault.lock();

    expect(entries.list()).toEqual(LOCKED);
    expect(entries.search("a")).toEqual(LOCKED);
    expect(entries.get("id-1")).toEqual(LOCKED);
    expect(folders.list()).toEqual(LOCKED);
    expect(folders.create("文件夹")).toEqual(LOCKED);
    expect(tags.list()).toEqual(LOCKED);
    expect(tags.create("标签", "red")).toEqual(LOCKED);
    expect(batch.removeEntries(["id-1"])).toEqual(LOCKED);
    expect(customTypes.list()).toEqual(LOCKED);
    expect(totp.getCode("id-1")).toEqual(LOCKED);
    expect(attachments.list("id-1")).toEqual(LOCKED);
    expect(attachments.read("att-1")).toEqual(LOCKED);
  });

  it("重新解锁后各业务服务恢复可用", async () => {
    const vault = await startMasterPasswordVault(getHarness);
    const { entries } = createEntryServiceFixture(vault);
    const { folders } = createFolderServiceFixture(vault);
    await vault.lock();

    await vault.unlock(TEST_MASTER_PASSWORD);

    expect(entries.list().ok).toBe(true);
    expect(folders.list().ok).toBe(true);
  });
});

describe("锁定后导出与邮箱备份拒绝", () => {
  const getHarness = useVaultServiceHarness();
  const databases = useRestoreDatabases("vault-lock-transfer");

  it("导出: 锁定后拒绝, 不弹保存对话框", async () => {
    const vault = await startMasterPasswordVault(getHarness);
    const { service, state } = createExportServiceFixture(() => vault.getOrm());
    await vault.lock();

    expect(await service.run(exportRequestOf())).toEqual(LOCKED);
    expect(state.dialogRequests).toEqual([]);
  });

  it("邮箱备份: 锁定后设置, 测试邮件, 立即备份与上次结果都拒绝", async () => {
    const vault = await startMasterPasswordVault(getHarness);
    const fixture = createEmailBackupFixture(
      () => vault.getOrm(),
      databases.getDirectory(),
    );
    await vault.lock();

    expect(await fixture.service.getSettings()).toEqual(LOCKED);
    expect(await fixture.service.saveSettings(savedSettingsInput())).toEqual(
      LOCKED,
    );
    expect(await fixture.service.sendTest()).toEqual(LOCKED);
    expect(await fixture.service.runBackup(RUN_WITH_ATTACHMENTS)).toEqual(
      LOCKED,
    );
    expect(fixture.service.getLastResult()).toEqual(LOCKED);
    expect(fixture.sent).toHaveLength(0);
  });
});

describe("锁定时释放内存里的解密状态", () => {
  const getHarness = useVaultServiceHarness();
  const databases = useRestoreDatabases("vault-lock-release");

  it("导入: 锁定时释放等待确认的明文, 之后选择文件也被拒绝", async () => {
    const { vault, importFixture } = await startWiredVault(
      getHarness,
      databases,
    );
    importFixture.state.files.set(
      SAMPLE_SOURCE_PATH,
      Buffer.from(bitwardenExport([bitwardenLogin()]), "utf8"),
    );
    const chosen = await importFixture.service.chooseFile("bitwardenJson");
    expect(chosen).toMatchObject({ ok: true, value: { status: "ready" } });

    const locked = await vault.lock();

    expect(locked).toEqual({ ok: true });
    expect(importFixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
    expect(await importFixture.service.chooseFile("bitwardenJson")).toEqual(
      LOCKED,
    );
  });

  it("恢复: 锁定时释放等待确认的备份, 之后选择文件也被拒绝", async () => {
    const { vault, restoreFixture } = await startWiredVault(
      getHarness,
      databases,
    );
    await prepareChosenBackup(restoreFixture, databases);
    const chosen = await restoreFixture.service.chooseFile();
    expect(chosen).toMatchObject({ ok: true, value: { status: "ready" } });
    expect(restoreFixture.session.peek()?.kind).toBe("pending");

    const locked = await vault.lock();

    expect(locked).toEqual({ ok: true });
    expect(restoreFixture.session.peek()).toBeUndefined();
    expect(await restoreFixture.service.chooseFile()).toEqual(LOCKED);
  });

  it("锁定时让自动备份调度暂停", async () => {
    const { vault, pauseAutoBackupUntilUnlocked } = await startWiredVault(
      getHarness,
      databases,
    );

    await vault.lock();

    expect(pauseAutoBackupUntilUnlocked).toHaveBeenCalledTimes(1);
  });
});
