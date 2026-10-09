import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  AUTO_LOCK_IDLE_MINUTES_OPTIONS,
  type AutoLockIdleMinutes,
} from "@shared/preferences/auto-lock-settings";

import {
  SelectField,
  type SelectFieldItem,
} from "@renderer/components/select-field";
import { useAutoLockSettings } from "@renderer/stores/use-auto-lock-settings";

/**
 * 自动锁定的空闲时长下拉的属性.
 */
interface AutoLockMinutesSelectProps {
  /**
   * 是否不可改.
   */
  readonly isDisabled: boolean;
  /**
   * 放在标签行右端的内容, 例如启用开关.
   */
  readonly labelAction?: ReactNode;
}

/**
 * 在可选档位里找出下拉的取值对应的分钟数.
 * @param value 下拉的取值.
 * @returns 对应的档位, 不是任何档位时为 undefined.
 */
function findMinutes(value: string): AutoLockIdleMinutes | undefined {
  return AUTO_LOCK_IDLE_MINUTES_OPTIONS.find(
    (minutes) => String(minutes) === value,
  );
}

/**
 * 空闲时长下拉: 选项是 1, 5, 15, 30, 60 分钟, 选了就立即保存. 标签行右端可以放一个内容.
 * @param props 组件属性.
 * @returns 下拉字段元素.
 */
export function AutoLockMinutesSelect(
  props: AutoLockMinutesSelectProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { settings, setIdleMinutes } = useAutoLockSettings();
  const items = useMemo<readonly SelectFieldItem[]>(
    () =>
      AUTO_LOCK_IDLE_MINUTES_OPTIONS.map((minutes) => ({
        value: String(minutes),
        label: t("settings.security.autoLock.idle.minutes", { minutes }),
      })),
    [t],
  );
  return (
    <SelectField
      label={t("settings.security.autoLock.idle.minutesLabel")}
      items={items}
      value={String(settings.idleMinutes)}
      isDisabled={props.isDisabled}
      labelAction={props.labelAction}
      onChange={(value) => {
        const minutes = findMinutes(value);
        if (minutes !== undefined) {
          setIdleMinutes(minutes);
        }
      }}
    />
  );
}
