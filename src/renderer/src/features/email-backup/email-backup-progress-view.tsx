import { useTranslation } from "react-i18next";

import type { EmailBackupProgressSnapshot } from "@shared/email-backup/email-backup-progress";

import { Progress, ProgressLabel } from "@renderer/components/ui/progress";

import type { EmailBackupActivity } from "./email-backup-flow-state";

/**
 * 处理进度视图的属性.
 */
interface EmailBackupProgressViewProps {
  /**
   * 正在做的事.
   */
  readonly activity: Exclude<EmailBackupActivity, "idle">;
  /**
   * 最近一次读到的备份进度, 只有立即备份期间才轮询.
   */
  readonly progress: EmailBackupProgressSnapshot | undefined;
}

/**
 * 进度条满格的百分比.
 */
const FULL_PERCENTAGE = 100;

/**
 * 进度百分比, 阶段没有细分进度 (总数为 0) 时为 null, 进度条显示为不定进度.
 * @param progress 进度快照.
 * @returns 0 到 100 的百分比, 或 null.
 */
function toPercentage(
  progress: EmailBackupProgressSnapshot | undefined,
): number | null {
  if (progress === undefined || progress.total === 0) {
    return null;
  }
  return Math.min(
    FULL_PERCENTAGE,
    (progress.processed / progress.total) * FULL_PERCENTAGE,
  );
}

/**
 * 取阶段标签的文案键: 保存与发测试邮件各有固定的文字, 立即备份按主进程报告的阶段.
 * @param props 组件属性.
 * @returns 文案键.
 */
function labelKeyOf(
  props: EmailBackupProgressViewProps,
):
  | "emailBackup.actions.saving"
  | "emailBackup.progress.sending"
  | `emailBackup.progress.${"idle" | "preparing" | "writing" | "finishing"}` {
  if (props.activity === "saving") {
    return "emailBackup.actions.saving";
  }
  if (props.activity === "testing") {
    return "emailBackup.progress.sending";
  }
  const stage = props.progress?.stage ?? "idle";
  return stage === "sending"
    ? "emailBackup.progress.sending"
    : `emailBackup.progress.${stage}`;
}

/**
 * 处理中的进度视图: 阶段名称, 进度条与已处理的个数. 没有细分进度的阶段显示不定进度.
 * @param props 组件属性.
 * @returns 进度元素.
 */
export function EmailBackupProgressView(
  props: EmailBackupProgressViewProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const hasCounts = props.progress !== undefined && props.progress.total > 0;
  return (
    <div className="flex flex-col gap-2" role="status">
      <Progress value={toPercentage(props.progress)}>
        <ProgressLabel>{t(labelKeyOf(props))}</ProgressLabel>
      </Progress>
      {hasCounts && (
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("emailBackup.progress.counts", {
            processed: props.progress?.processed ?? 0,
            total: props.progress?.total ?? 0,
          })}
        </p>
      )}
    </div>
  );
}
