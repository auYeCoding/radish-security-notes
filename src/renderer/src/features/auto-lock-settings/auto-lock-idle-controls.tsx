import { useAutoLockSettings } from "@renderer/stores/use-auto-lock-settings";

import { AutoLockMinutesSelect } from "./auto-lock-minutes-select";
import { AutoLockToggle } from "./auto-lock-toggle";

/**
 * 空闲自动锁定控件的属性.
 */
interface AutoLockIdleControlsProps {
  /**
   * 是否不可改, 保险库没有设主密码时自动锁定不生效, 开关与时长都不可改.
   */
  readonly isDisabled: boolean;
}

/**
 * 空闲自动锁定行的控件: 一个时长下拉, 开关在下拉标签 "空闲时长" 所在的行, 靠右对齐. 开关关闭时时长也
 * 不可改, 因为这时时长没有用.
 * @param props 组件属性.
 * @returns 控件元素.
 */
export function AutoLockIdleControls(
  props: AutoLockIdleControlsProps,
): React.JSX.Element {
  const { settings } = useAutoLockSettings();
  return (
    <div className="min-w-40">
      <AutoLockMinutesSelect
        isDisabled={props.isDisabled || !settings.isIdleLockEnabled}
        labelAction={
          <AutoLockToggle
            settingKey="isIdleLockEnabled"
            isDisabled={props.isDisabled}
          />
        }
      />
    </div>
  );
}
