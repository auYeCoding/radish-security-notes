import { useTranslation } from "react-i18next";

import { SwitchField } from "@renderer/components/switch-field";
import {
  useAutoLockSettings,
  type AutoLockSwitchKey,
} from "@renderer/stores/use-auto-lock-settings";

/**
 * 每个开关所属设置行的名称文案键, 用作开关分组的无障碍名称.
 */
const GROUP_NAME_KEYS = {
  isIdleLockEnabled: "settings.security.autoLock.idle.name",
  isScreenLockEnabled: "settings.security.autoLock.screenLock.name",
  isSleepLockEnabled: "settings.security.autoLock.sleep.name",
} as const satisfies Record<AutoLockSwitchKey, string>;

/**
 * 自动锁定开关的属性.
 */
interface AutoLockToggleProps {
  /**
   * 这个开关对应的设置字段.
   */
  readonly settingKey: AutoLockSwitchKey;
  /**
   * 是否不可改, 保险库没有设主密码时自动锁定不生效, 开关不可改.
   */
  readonly isDisabled: boolean;
}

/**
 * 自动锁定的一个开关: 反映偏好里对应字段的当前值, 点击后立即保存. 空闲, 锁屏, 休眠三个开关共用.
 * 开关旁的文字固定是 "启用", 不随状态变化, 整个开关组以所属设置行的名称命名.
 * @param props 组件属性.
 * @returns 开关元素.
 */
export function AutoLockToggle(props: AutoLockToggleProps): React.JSX.Element {
  const { t } = useTranslation();
  const { settings, setSwitch } = useAutoLockSettings();
  return (
    <div role="group" aria-label={t(GROUP_NAME_KEYS[props.settingKey])}>
      <SwitchField
        label={t("settings.security.autoLock.toggleLabel")}
        isChecked={settings[props.settingKey]}
        isDisabled={props.isDisabled}
        onCheckedChange={(isChecked) => setSwitch(props.settingKey, isChecked)}
      />
    </div>
  );
}
