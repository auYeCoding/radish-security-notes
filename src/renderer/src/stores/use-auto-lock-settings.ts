import { useCallback } from "react";

import type {
  AutoLockIdleMinutes,
  AutoLockSettings,
} from "@shared/preferences/auto-lock-settings";

import { detachPromise } from "@renderer/lib/detach-promise";

import { usePreferencesStore } from "./use-preferences-store";

/**
 * 自动锁定设置里开关的字段名, 由设置类型里取值为布尔的字段派生, 新增或改名开关字段时随之变化,
 * 不再手写一份.
 */
export type AutoLockSwitchKey = {
  [Key in keyof AutoLockSettings]: AutoLockSettings[Key] extends boolean
    ? Key
    : never;
}[keyof AutoLockSettings];

/**
 * 当前的自动锁定设置与修改它的方法.
 */
export interface AutoLockSettingsHandle {
  /**
   * 当前的自动锁定设置.
   */
  readonly settings: AutoLockSettings;
  /**
   * 打开或关闭一个开关, 先经主进程保存, 成功后才更新界面状态.
   */
  readonly setSwitch: (key: AutoLockSwitchKey, isOn: boolean) => void;
  /**
   * 改变空闲多久后自动锁定.
   */
  readonly setIdleMinutes: (minutes: AutoLockIdleMinutes) => void;
}

/**
 * 读取偏好里的自动锁定设置并提供修改它的方法. 每次修改都以当前设置为底整体保存; 主进程保存失败时
 * 偏好 store 不更新, 界面保持原值, 失败不再向外抛.
 * @returns 设置与修改方法.
 */
export function useAutoLockSettings(): AutoLockSettingsHandle {
  const settings = usePreferencesStore((state) => state.autoLock);
  const setAutoLock = usePreferencesStore((state) => state.setAutoLock);
  const setSwitch = useCallback(
    (key: AutoLockSwitchKey, isOn: boolean) => {
      detachPromise(setAutoLock({ ...settings, [key]: isOn }));
    },
    [settings, setAutoLock],
  );
  const setIdleMinutes = useCallback(
    (idleMinutes: AutoLockIdleMinutes) => {
      detachPromise(setAutoLock({ ...settings, idleMinutes }));
    },
    [settings, setAutoLock],
  );
  return { settings, setSwitch, setIdleMinutes };
}
