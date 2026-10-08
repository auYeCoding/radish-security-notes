import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi, type Mock } from "vitest";

import type { TemporaryCopyFileSystemPort } from "../attachments/attachment-file-port";
import { NODE_TEMPORARY_COPY_FILE_SYSTEM } from "../attachments/node-attachment-file-system";
import { TemporaryCopyStore } from "../attachments/temporary-copy-store";
import { startUnlockedProbeService } from "../testing/recovery-vault-fixtures";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  useVaultServiceHarness,
  type VaultServiceHarness,
} from "../testing/vault-service-harness";
import { createLockRegistry, type LockRegistry } from "../vault/lock-registry";
import type { VaultService } from "../vault/vault-service";
import { registerLockParticipants } from "./register-lock-participants";

/**
 * 明文临时副本的文件名.
 */
const COPY_NAME = "secret.txt";

/**
 * 接好锁定的保险库与明文临时副本存储.
 */
interface WiredCopies {
  /**
   * 已解锁的保险库服务.
   */
  readonly service: VaultService;
  /**
   * 明文临时副本存储.
   */
  readonly copies: TemporaryCopyStore;
  /**
   * 副本的专属目录.
   */
  readonly baseDirectory: string;
  /**
   * 删除副本失败时的回调间谍.
   */
  readonly onFailure: Mock<(error: unknown) => void>;
  /**
   * 锁定登记处.
   */
  readonly registry: LockRegistry;
}

/**
 * 创建已解锁的保险库, 并把真实的明文临时副本存储 (真实文件系统) 按应用启动时的装配登记进锁定
 * 登记处, 其它参与者用不忙碌的替身.
 * @param harness 保险库服务测试环境.
 * @param directory 临时目录, 副本的专属目录建在它里面.
 * @param fileSystem 副本存储用的文件系统, 默认是真实的.
 * @returns 接好锁定的保险库与副本存储.
 */
async function wireCopies(
  harness: VaultServiceHarness,
  directory: string,
  fileSystem: TemporaryCopyFileSystemPort = NODE_TEMPORARY_COPY_FILE_SYSTEM,
): Promise<WiredCopies> {
  const baseDirectory = join(directory, "attachment-open");
  const onFailure = vi.fn<(error: unknown) => void>();
  let sequence = 0;
  const copies = new TemporaryCopyStore({
    fileSystem,
    baseDirectory,
    createIdentifier: () => `copy-${(sequence += 1)}`,
    onFailure,
  });
  const registry = createLockRegistry();
  registerLockParticipants(registry, {
    importService: { hasRunningTask: () => false, discardPending: vi.fn() },
    exportService: { hasRunningTask: () => false },
    restoreService: { hasRunningTask: () => false, discardPending: vi.fn() },
    emailBackupService: { hasRunningTask: () => false },
    pauseAutoBackupUntilUnlocked: vi.fn(),
    discardAttachmentTemporaryCopies: () => copies.discardAll(),
  });
  const service = await startUnlockedProbeService(harness, "master-password", {
    lockRegistry: registry,
  });
  return { service, copies, baseDirectory, onFailure, registry };
}

describe("锁定时删除附件明文临时副本", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("lock-attachment-copies");

  it("锁定成功后副本和专属目录都被删除", async () => {
    const wired = await wireCopies(getHarness(), getDirectory());
    const filePath = await wired.copies.create(COPY_NAME, Buffer.from("明文"));
    expect(existsSync(filePath)).toBe(true);

    const result = await wired.service.lock();

    expect(result).toEqual({ ok: true });
    expect(existsSync(filePath)).toBe(false);
    expect(existsSync(wired.baseDirectory)).toBe(false);
  });

  it("多个副本一次全部删除, 重新解锁后再打开附件仍能创建副本", async () => {
    const wired = await wireCopies(getHarness(), getDirectory());
    const first = await wired.copies.create(COPY_NAME, Buffer.from("一"));
    const second = await wired.copies.create(COPY_NAME, Buffer.from("二"));

    await wired.service.lock();

    expect(existsSync(first) || existsSync(second)).toBe(false);
    const again = await wired.copies.create(COPY_NAME, Buffer.from("三"));
    expect(existsSync(again)).toBe(true);
  });

  it("锁定被进行中的任务拒绝时副本保留, 强制锁定时才删除", async () => {
    const wired = await wireCopies(getHarness(), getDirectory());
    wired.registry.addBusyProbe(() => true);
    const filePath = await wired.copies.create(COPY_NAME, Buffer.from("明文"));

    const rejected = await wired.service.lock();
    expect(rejected).toEqual({ ok: false, reason: "tasks-running" });
    expect(existsSync(filePath)).toBe(true);

    await wired.service.lock({ shouldIgnoreRunningTasks: true });
    expect(existsSync(filePath)).toBe(false);
  });
});

/**
 * 第一次删除抛错 (模拟文件被外部程序占用), 之后恢复真实删除的文件系统.
 * @returns 带一次删除失败的文件系统.
 */
function createBusyOnceFileSystem(): TemporaryCopyFileSystemPort {
  let hasFailed = false;
  return {
    ...NODE_TEMPORARY_COPY_FILE_SYSTEM,
    removeDirectoryTreeSync: (directoryPath) => {
      if (!hasFailed) {
        hasFailed = true;
        throw new Error("EBUSY: 文件被占用");
      }
      NODE_TEMPORARY_COPY_FILE_SYSTEM.removeDirectoryTreeSync(directoryPath);
    },
  };
}

describe("锁定时副本被外部程序占用而删不掉", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("lock-attachment-copies");

  it("锁定照常完成, 失败只走既有回调, 副本留到退出时再删", async () => {
    const wired = await wireCopies(
      getHarness(),
      getDirectory(),
      createBusyOnceFileSystem(),
    );
    const filePath = await wired.copies.create(COPY_NAME, Buffer.from("明文"));

    const result = await wired.service.lock();

    expect(result).toEqual({ ok: true });
    expect(wired.service.getStatus()).toBe("locked");
    expect(wired.onFailure).toHaveBeenCalledTimes(1);
    expect(existsSync(filePath)).toBe(true);

    wired.copies.discardAll();
    expect(existsSync(filePath)).toBe(false);
    expect(wired.onFailure).toHaveBeenCalledTimes(1);
  });
});
