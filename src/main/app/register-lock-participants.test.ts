import { describe, expect, it, vi } from "vitest";

import { createLockRegistry } from "../vault/lock-registry";
import {
  registerLockParticipants,
  type LockParticipants,
} from "./register-lock-participants";

/**
 * 各业务模块的忙碌状态, 测试里改它来模拟任务开始与结束.
 */
interface BusyFlags {
  /**
   * 导入是否进行中.
   */
  importing: boolean;
  /**
   * 导出是否进行中.
   */
  exporting: boolean;
  /**
   * 恢复是否进行中.
   */
  restoring: boolean;
  /**
   * 邮箱备份是否进行中.
   */
  emailing: boolean;
}

/**
 * 替身参与者与它们的忙碌状态, 释放动作的间谍.
 */
interface ParticipantsRig {
  /**
   * 交给登记函数的替身参与者.
   */
  readonly participants: LockParticipants;
  /**
   * 各业务模块的忙碌状态.
   */
  readonly busy: BusyFlags;
  /**
   * 导入服务释放待确认明文的间谍.
   */
  readonly discardImport: ReturnType<typeof vi.fn>;
  /**
   * 恢复服务释放待确认备份的间谍.
   */
  readonly discardRestore: ReturnType<typeof vi.fn>;
  /**
   * 暂停自动备份的间谍.
   */
  readonly pauseAutoBackup: ReturnType<typeof vi.fn>;
  /**
   * 删除附件明文临时副本的间谍.
   */
  readonly discardAttachmentCopies: ReturnType<typeof vi.fn>;
}

/**
 * 创建替身参与者与它们的忙碌状态.
 * @returns 参与者, 忙碌状态与各释放动作的间谍.
 */
function createParticipants(): ParticipantsRig {
  const busy: BusyFlags = {
    importing: false,
    exporting: false,
    restoring: false,
    emailing: false,
  };
  const discardImport = vi.fn();
  const discardRestore = vi.fn();
  const pauseAutoBackup = vi.fn();
  const discardAttachmentCopies = vi.fn();
  return {
    busy,
    discardImport,
    discardRestore,
    pauseAutoBackup,
    discardAttachmentCopies,
    participants: {
      importService: {
        hasRunningTask: () => busy.importing,
        discardPending: discardImport,
      },
      exportService: { hasRunningTask: () => busy.exporting },
      restoreService: {
        hasRunningTask: () => busy.restoring,
        discardPending: discardRestore,
      },
      emailBackupService: { hasRunningTask: () => busy.emailing },
      pauseAutoBackupUntilUnlocked: pauseAutoBackup,
      discardAttachmentTemporaryCopies: discardAttachmentCopies,
    },
  };
}

describe("registerLockParticipants", () => {
  it("四类任务都没进行时没有任务进行中", () => {
    const registry = createLockRegistry();
    registerLockParticipants(registry, createParticipants().participants);

    expect(registry.hasRunningTask()).toBe(false);
  });

  it.each([
    ["导入", "importing"],
    ["导出", "exporting"],
    ["恢复", "restoring"],
    ["邮箱备份", "emailing"],
  ] as const)("%s进行中时算任务进行中", (_name, flag) => {
    const registry = createLockRegistry();
    const { participants, busy } = createParticipants();
    registerLockParticipants(registry, participants);

    busy[flag] = true;

    expect(registry.hasRunningTask()).toBe(true);
  });

  it("锁定时释放导入与恢复的待确认明文, 并让自动备份暂停", () => {
    const registry = createLockRegistry();
    const { participants, discardImport, discardRestore, pauseAutoBackup } =
      createParticipants();
    registerLockParticipants(registry, participants);

    registry.releaseAll();

    expect(discardImport).toHaveBeenCalledTimes(1);
    expect(discardRestore).toHaveBeenCalledTimes(1);
    expect(pauseAutoBackup).toHaveBeenCalledTimes(1);
  });

  it("登记时不会提前执行释放动作", () => {
    const registry = createLockRegistry();
    const { participants, discardImport, discardRestore, pauseAutoBackup } =
      createParticipants();

    registerLockParticipants(registry, participants);

    expect(discardImport).not.toHaveBeenCalled();
    expect(discardRestore).not.toHaveBeenCalled();
    expect(pauseAutoBackup).not.toHaveBeenCalled();
  });
});

describe("registerLockParticipants: 附件明文临时副本", () => {
  it("锁定时删除附件明文临时副本, 登记时不会提前删除", () => {
    const registry = createLockRegistry();
    const { participants, discardAttachmentCopies } = createParticipants();

    registerLockParticipants(registry, participants);
    expect(discardAttachmentCopies).not.toHaveBeenCalled();

    registry.releaseAll();

    expect(discardAttachmentCopies).toHaveBeenCalledTimes(1);
  });

  it("删除副本抛错时其它释放动作照常执行, 错误不外泄", () => {
    const registry = createLockRegistry();
    const { participants, discardImport, pauseAutoBackup } =
      createParticipants();
    registerLockParticipants(registry, {
      ...participants,
      discardAttachmentTemporaryCopies: () => {
        throw new Error("文件被占用");
      },
    });

    expect(() => registry.releaseAll()).not.toThrow();
    expect(discardImport).toHaveBeenCalledTimes(1);
    expect(pauseAutoBackup).toHaveBeenCalledTimes(1);
  });

  it("附件副本不算进行中的任务", () => {
    const registry = createLockRegistry();
    registerLockParticipants(registry, createParticipants().participants);

    expect(registry.hasRunningTask()).toBe(false);
  });
});
