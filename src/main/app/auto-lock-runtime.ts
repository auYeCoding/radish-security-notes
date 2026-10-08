import { powerMonitor, type BrowserWindow } from "electron";

import { AutoLockController } from "../auto-lock/auto-lock-controller";
import { createAutoLockNotifier } from "../auto-lock/auto-lock-notifier";
import { createPowerMonitorActivity } from "../auto-lock/power-monitor-system-activity";
import { SYSTEM_SCHEDULER_CLOCK } from "../email-backup/scheduler-clock";
import type { PreferencesService } from "../preferences/preferences-service";
import type { VaultService } from "../vault/vault-service";
import type { MainWindowHolder } from "../window/main-window-holder";

/**
 * 自动锁定运行时的依赖.
 */
export interface AutoLockRuntimeDependencies {
  /**
   * 保险库服务, 自动锁定经它的锁定入口锁定.
   */
  readonly vault: VaultService;
  /**
   * 偏好服务, 每个检查周期从它读取自动锁定设置.
   */
  readonly preferences: Pick<PreferencesService, "getAutoLockSettings">;
  /**
   * 主窗口持有者, 自动锁定成功后向它的页面推送原因.
   */
  readonly mainWindowHolder: MainWindowHolder<BrowserWindow>;
}

/**
 * 自动锁定运行时对象.
 */
export interface AutoLockRuntime {
  /**
   * 启动自动锁定: 开始周期检查并订阅系统锁屏与休眠.
   */
  readonly start: () => void;
  /**
   * 停止自动锁定, 应用退出时调用.
   */
  readonly stop: () => void;
}

/**
 * 创建自动锁定运行时对象: 把 Electron 的系统电源监视适配成系统活动端口, 与保险库服务, 偏好设置
 * 和主窗口通知装配成控制模块. 必须在 app ready 之后调用, 因为 `powerMonitor` 要求如此.
 * @param dependencies 运行时依赖.
 * @returns 自动锁定运行时对象.
 */
export function createAutoLockRuntime(
  dependencies: AutoLockRuntimeDependencies,
): AutoLockRuntime {
  const { vault, preferences, mainWindowHolder } = dependencies;
  const controller = new AutoLockController({
    clock: SYSTEM_SCHEDULER_CLOCK,
    activity: createPowerMonitorActivity(powerMonitor),
    vault: {
      isUnlocked: () => vault.getStatus() === "unlocked",
      lock: (options) => vault.lock(options),
    },
    readSettings: () => preferences.getAutoLockSettings(),
    onLocked: createAutoLockNotifier(mainWindowHolder),
  });
  return {
    start: () => controller.start(),
    stop: () => controller.stop(),
  };
}
