import type { BrowserWindow } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import { DEFAULT_AUTO_LOCK_SETTINGS } from "@shared/preferences/auto-lock-settings";
import { VAULT_OPERATION_SUCCEEDED } from "@shared/vault/vault-operation-result";

import type { VaultService } from "../vault/vault-service";
import { createMainWindowHolder } from "../window/main-window-holder";
import {
  createAutoLockRuntime,
  type AutoLockRuntimeDependencies,
} from "./auto-lock-runtime";

/**
 * 替身 electron 模块里的系统电源监视: 事件发射器加可调的空闲秒数.
 */
const electronMocks = await vi.hoisted(async () => {
  const { EventEmitter } = await import("node:events");
  const emitter = new EventEmitter();
  const idleSeconds = { current: 0 };
  return {
    emitter,
    idleSeconds,
    powerMonitor: Object.assign(emitter, {
      getSystemIdleTime: () => idleSeconds.current,
    }),
  };
});

vi.mock("electron", () => ({ powerMonitor: electronMocks.powerMonitor }));

/**
 * 假保险库: 状态可变, 锁定成功后变为已锁定.
 */
interface FakeVault {
  /**
   * 交给运行时的保险库服务替身.
   */
  readonly service: VaultService;
  /**
   * 锁定入口间谍.
   */
  readonly lock: ReturnType<typeof vi.fn>;
}

/**
 * 创建假保险库.
 * @returns 假保险库.
 */
function createVault(): FakeVault {
  let status = "unlocked";
  const lock = vi.fn(() => {
    status = "locked";
    return Promise.resolve(VAULT_OPERATION_SUCCEEDED);
  });
  const service = {
    getStatus: () => status,
    lock,
  } as unknown as VaultService;
  return { service, lock };
}

/**
 * 带一个假主窗口的持有者与它的页面推送间谍.
 */
interface FakeHolder {
  /**
   * 交给运行时的主窗口持有者.
   */
  readonly holder: AutoLockRuntimeDependencies["mainWindowHolder"];
  /**
   * 假主窗口页面的推送间谍.
   */
  readonly send: ReturnType<typeof vi.fn>;
}

/**
 * 创建带一个假主窗口的持有者.
 * @returns 持有者与页面推送间谍.
 */
function createHolder(): FakeHolder {
  const send = vi.fn();
  const holder = createMainWindowHolder<BrowserWindow>();
  holder.set({
    webContents: { send },
    isDestroyed: () => false,
  } as unknown as BrowserWindow);
  return { holder, send };
}

beforeEach(() => {
  vi.useFakeTimers();
  electronMocks.idleSeconds.current = 0;
  electronMocks.emitter.removeAllListeners();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutoLockRuntime", () => {
  it("启动后空闲到时长就经保险库的锁定入口锁定, 并向主窗口页面推送原因", async () => {
    const { service, lock } = createVault();
    const { holder, send } = createHolder();
    const runtime = createAutoLockRuntime({
      vault: service,
      preferences: { getAutoLockSettings: () => DEFAULT_AUTO_LOCK_SETTINGS },
      mainWindowHolder: holder,
    });
    runtime.start();

    electronMocks.idleSeconds.current = 15 * 60;
    await vi.advanceTimersByTimeAsync(5000);

    expect(lock).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.vaultAutoLocked, "idle");
    runtime.stop();
  });
});

describe("createAutoLockRuntime: 事件与设置", () => {
  it("系统锁屏事件触发锁定, 停止后取消订阅", async () => {
    const { service, lock } = createVault();
    const { holder, send } = createHolder();
    const runtime = createAutoLockRuntime({
      vault: service,
      preferences: { getAutoLockSettings: () => DEFAULT_AUTO_LOCK_SETTINGS },
      mainWindowHolder: holder,
    });
    runtime.start();
    expect(electronMocks.emitter.listenerCount("lock-screen")).toBe(1);
    expect(electronMocks.emitter.listenerCount("suspend")).toBe(1);

    electronMocks.emitter.emit("lock-screen");
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledWith(
      IPC_CHANNELS.vaultAutoLocked,
      "screen-lock",
    );

    runtime.stop();
    expect(electronMocks.emitter.listenerCount("lock-screen")).toBe(0);
    expect(electronMocks.emitter.listenerCount("suspend")).toBe(0);
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it("设置取自偏好服务: 关掉的触发不响应", async () => {
    const { service, lock } = createVault();
    const { holder } = createHolder();
    const runtime = createAutoLockRuntime({
      vault: service,
      preferences: {
        getAutoLockSettings: () => ({
          ...DEFAULT_AUTO_LOCK_SETTINGS,
          isSleepLockEnabled: false,
        }),
      },
      mainWindowHolder: holder,
    });
    runtime.start();

    electronMocks.emitter.emit("suspend");
    await vi.advanceTimersByTimeAsync(0);

    expect(lock).not.toHaveBeenCalled();
    runtime.stop();
  });
});
