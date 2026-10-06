import { useTranslation } from "react-i18next";

import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";

import { describeAutoBackupPhase } from "./describe-auto-backup";
import { describeEmailBackupFailure } from "./describe-email-backup-failure";
import { formatBackupTime } from "./format-backup-time";

/**
 * 自动备份状态说明的属性.
 */
interface AutoBackupStateLinesProps {
  /**
   * 自动备份的状态.
   */
  readonly status: AutoBackupStatus;
  /**
   * 开启或改间隔之前是否还缺主密码.
   */
  readonly isMasterPasswordMissing: boolean;
}

/**
 * 因超限而失败时的失败原因: 自动备份不会擅自去掉附件, 要提示用户手动处理.
 */
const OVERSIZE_FAILURES: readonly AutoBackupStatus["lastFailureReason"][] = [
  "too-large",
  "server-rejected-size",
];

/**
 * 自动备份的状态说明: 现在还不能开启的原因, 缺主密码的提示, 当前阶段, 最近一次自动备份失败的时间与
 * 原因, 超限时手动处理的提示. 失败原因复用立即备份的失败文案.
 * @param props 组件属性.
 * @returns 状态说明元素.
 */
export function AutoBackupStateLines(
  props: AutoBackupStateLinesProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { status } = props;
  const { blocker, lastFailureReason, lastFailureAt } = status;
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      {blocker !== undefined && (
        <p>
          {t("emailBackup.auto.blocked", {
            reason: describeEmailBackupFailure(blocker, t),
          })}
        </p>
      )}
      {props.isMasterPasswordMissing && (
        <p>{t("emailBackup.auto.needMasterPassword")}</p>
      )}
      <p role="status">{describeAutoBackupPhase(status, t, i18n.language)}</p>
      {lastFailureReason !== undefined && lastFailureAt !== undefined && (
        <p>
          {t("emailBackup.auto.lastFailure", {
            time: formatBackupTime(lastFailureAt, i18n.language),
            reason: describeEmailBackupFailure(lastFailureReason, t),
          })}
        </p>
      )}
      {OVERSIZE_FAILURES.includes(lastFailureReason) && (
        <p>{t("emailBackup.auto.tooLargeHint")}</p>
      )}
    </div>
  );
}
