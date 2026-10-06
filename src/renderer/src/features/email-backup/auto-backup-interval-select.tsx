import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  AUTO_BACKUP_INTERVALS,
  isAutoBackupInterval,
  type AutoBackupInterval,
} from "@shared/email-backup/auto-backup-interval";

import {
  SelectField,
  type SelectFieldItem,
} from "@renderer/components/select-field";

/**
 * 间隔下拉的属性.
 */
interface AutoBackupIntervalSelectProps {
  /**
   * 当前选的间隔.
   */
  readonly value: AutoBackupInterval;
  /**
   * 选了别的间隔时的回调.
   */
  readonly onChange: (interval: AutoBackupInterval) => void;
  /**
   * 是否不可改.
   */
  readonly isDisabled: boolean;
}

/**
 * 自动备份间隔下拉: 选项是每天, 每 3 天与每周.
 * @param props 组件属性.
 * @returns 下拉字段元素.
 */
export function AutoBackupIntervalSelect(
  props: AutoBackupIntervalSelectProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const items = useMemo<readonly SelectFieldItem[]>(
    () =>
      AUTO_BACKUP_INTERVALS.map((key) => ({
        value: key,
        label: t(`emailBackup.auto.interval.${key}`),
      })),
    [t],
  );
  return (
    <SelectField
      label={t("emailBackup.auto.interval.label")}
      items={items}
      value={props.value}
      isDisabled={props.isDisabled}
      onChange={(value) => {
        if (isAutoBackupInterval(value)) {
          props.onChange(value);
        }
      }}
    />
  );
}
