import { vi, type Mock } from "vitest";

import {
  DEFAULT_AUTO_LOCK_SETTINGS,
  type AutoLockSettings,
} from "@shared/preferences/auto-lock-settings";
import {
  VAULT_OPERATION_SUCCEEDED,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";

import { AutoLockController } from "../auto-lock/auto-lock-controller";
import { AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS } from "../auto-lock/auto-lock-timing";
import { SYSTEM_SCHEDULER_CLOCK } from "../email-backup/scheduler-clock";
import type { VaultLockOptions } from "../vault/vault-locker";

/**
 * 测试里可以随时改动的外部状态.
 */
export interface AutoLockRigState {
  /**
   * 保险库是否已解锁, 假锁定成功时会置为 false.
   */
  isUnlocked: boolean;
  /**
   * 假系统已空闲的秒数.
   */
  idleSeconds: number;
  /**
   * 当前的自动锁定设置.
   */
  settings: AutoLockSettings;
  /**
   * 为 true 时读取设置会抛错.
   */
  shouldFailReadingSettings: boolean;
}

/**
 * 当前订阅着的系统事件数量.
 */
export interface SubscriptionCounts {
  /**
   * 订阅着锁屏事件的监听函数数量.
   */
  readonly screenLock: number;
  /**
   * 订阅着休眠事件的监听函数数量.
   */
  readonly suspend: number;
}

/**
 * 假的锁定入口间谍的类型.
 */
export type FakeLock = Mock<
  (options: VaultLockOptions) => Promise<VaultOperationResult>
>;

/**
 * 自动锁定控制与它的假依赖.
 */
export interface AutoLockRig {
  /**
   * 被测的控制.
   */
  readonly controller: AutoLockController;
  /**
   * 可以随时改动的外部状态.
   */
  readonly state: AutoLockRigState;
  /**
   * 假的锁定入口, 默认成功并把保险库置为已锁定.
   */
  readonly lock: FakeLock;
  /**
   * 自动锁定成功后的回调间谍.
   */
  readonly onLocked: Mock<(reason: string) => void>;
  /**
   * 模拟系统锁屏.
   */
  readonly fireScreenLock: () => void;
  /**
   * 模拟系统休眠.
   */
  readonly fireSuspend: () => void;
  /**
   * 当前订阅着的系统事件数量, 按事件区分.
   */
  readonly subscriptionCounts: () => SubscriptionCounts;
}

/**
 * 一个检查周期的毫秒数.
 */
export const RIG_CHECK_INTERVAL = AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS;

/**
 * 创建默认成功的假锁定入口: 成功时把保险库置为已锁定, 与真实的保险库一致.
 * @param state 外部状态.
 * @returns 假锁定入口间谍.
 */
function createFakeLock(state: AutoLockRigState): FakeLock {
  return vi.fn<(options: VaultLockOptions) => Promise<VaultOperationResult>>(
    () => {
      state.isUnlocked = false;
      return Promise.resolve(VAULT_OPERATION_SUCCEEDED);
    },
  );
}

/**
 * 登记一个事件监听函数.
 * @param listeners 监听函数集合.
 * @param listener 要登记的监听函数.
 * @returns 取消登记的函数.
 */
function addListener(
  listeners: Set<() => void>,
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/**
 * 创建自动锁定控制与假依赖, 时钟用系统定时器加 vitest 的假定时器, 调用方要先 `vi.useFakeTimers()`.
 * @param overrides 覆盖初始状态.
 * @returns 控制与假依赖.
 */
export function createAutoLockRig(
  overrides: Partial<AutoLockRigState> = {},
): AutoLockRig {
  const state: AutoLockRigState = {
    isUnlocked: true,
    idleSeconds: 0,
    settings: DEFAULT_AUTO_LOCK_SETTINGS,
    shouldFailReadingSettings: false,
    ...overrides,
  };
  const lock = createFakeLock(state);
  const onLocked = vi.fn<(reason: string) => void>();
  const screenLockListeners = new Set<() => void>();
  const suspendListeners = new Set<() => void>();
  const controller = new AutoLockController({
    clock: SYSTEM_SCHEDULER_CLOCK,
    activity: {
      getIdleSeconds: () => state.idleSeconds,
      onScreenLock: (listener) => addListener(screenLockListeners, listener),
      onSuspend: (listener) => addListener(suspendListeners, listener),
    },
    vault: { isUnlocked: () => state.isUnlocked, lock },
    readSettings: () => {
      if (state.shouldFailReadingSettings) {
        throw new Error("读取设置失败");
      }
      return state.settings;
    },
    onLocked,
  });
  return {
    controller,
    state,
    lock,
    onLocked,
    fireScreenLock: () => screenLockListeners.forEach((listener) => listener()),
    fireSuspend: () => suspendListeners.forEach((listener) => listener()),
    subscriptionCounts: () => ({
      screenLock: screenLockListeners.size,
      suspend: suspendListeners.size,
    }),
  };
}
