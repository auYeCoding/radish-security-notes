import { useTranslation } from "react-i18next";

import type { RestoreProgressSnapshot } from "@shared/restore/restore-types";

import { Progress, ProgressLabel } from "@renderer/components/ui/progress";

/**
 * 处理中步骤的属性.
 */
interface RestoreProgressStepProps {
  /**
   * 最近一次读到的进度, 还没读到时为 undefined.
   */
  readonly progress: RestoreProgressSnapshot | undefined;
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
  progress: RestoreProgressSnapshot | undefined,
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
 * 主进程处理中的步骤: 阶段名称, 进度条与已处理的个数. 进度由轮询读到, 没有细分进度的阶段显示不定
 * 进度. 这一步没有取消按钮, 处理期间对话框也不能关闭.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function RestoreProgressStep(
  props: RestoreProgressStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const stage = props.progress?.stage ?? "idle";
  const hasCounts = props.progress !== undefined && props.progress.total > 0;
  return (
    <div className="flex flex-col gap-2" role="status">
      <Progress value={toPercentage(props.progress)}>
        <ProgressLabel>{t(`restore.progress.${stage}`)}</ProgressLabel>
      </Progress>
      {hasCounts && (
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("restore.progress.counts", {
            processed: props.progress?.processed ?? 0,
            total: props.progress?.total ?? 0,
          })}
        </p>
      )}
    </div>
  );
}
