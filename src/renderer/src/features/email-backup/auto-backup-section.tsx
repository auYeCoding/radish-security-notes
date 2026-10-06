import { useTranslation } from "react-i18next";

import { SwitchField } from "@renderer/components/switch-field";

import { AutoBackupIntervalSelect } from "./auto-backup-interval-select";
import {
  canChangeAutoBackupInterval,
  canTurnOnAutoBackup,
  isMasterPasswordMissing,
} from "./auto-backup-rules";
import { AutoBackupStateLines } from "./auto-backup-state-lines";
import type { EmailBackupFlow } from "./use-email-backup-flow";

/**
 * 自动备份区的属性.
 */
interface AutoBackupSectionProps {
  /**
   * 邮箱备份对话框的流程.
   */
  readonly flow: EmailBackupFlow;
}

/**
 * 自动备份区: 说明, 开关, 间隔下拉与状态说明. 开关与间隔一改动就保存, 没有单独的保存按钮. 现在还不能
 * 开启 (邮箱设置不全, 有未保存的修改, 缺主密码) 时开关不可打开, 状态说明里写明原因; 关闭随时可以.
 * @param props 组件属性.
 * @returns 自动备份区元素.
 */
export function AutoBackupSection(
  props: AutoBackupSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { flow } = props;
  const { autoBackup, draft, view } = flow.state;
  const isTurnedOn = autoBackup.isEnabled;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{t("emailBackup.auto.heading")}</h3>
      <p className="text-sm text-muted-foreground">
        {t("emailBackup.auto.description")}
      </p>
      <SwitchField
        label={t("emailBackup.auto.switch.label")}
        description={t("emailBackup.auto.switch.hint")}
        isChecked={isTurnedOn}
        isDisabled={
          !isTurnedOn && !canTurnOnAutoBackup(autoBackup, draft, view)
        }
        onCheckedChange={(isEnabled) =>
          void flow.saveAuto({ isEnabled, interval: autoBackup.interval })
        }
      />
      <AutoBackupIntervalSelect
        value={autoBackup.interval}
        isDisabled={!canChangeAutoBackupInterval(autoBackup, draft, view)}
        onChange={(interval) =>
          void flow.saveAuto({ isEnabled: isTurnedOn, interval })
        }
      />
      <AutoBackupStateLines
        status={autoBackup}
        isMasterPasswordMissing={isMasterPasswordMissing(draft, view)}
      />
    </section>
  );
}
