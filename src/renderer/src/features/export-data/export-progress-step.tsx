import { useTranslation } from "react-i18next";

import type { ExportProgressSnapshot } from "@shared/export/export-types";

import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";
import { Progress, ProgressLabel } from "@renderer/components/ui/progress";

/**
 * 处理中步骤的属性.
 */
interface ExportProgressStepProps {
  /**
   * 最近一次读到的进度, 还没读到时为 undefined.
   */
  readonly progress: ExportProgressSnapshot | undefined;
  /**
   * 点取消时的回调.
   */
  readonly onCancel: () => void;
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
  progress: ExportProgressSnapshot | undefined,
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
 * 主进程处理中的步骤: 阶段名称, 进度条与已处理的个数, 取消按钮. 进度由轮询读到, 没有细分进度的阶段
 * (准备, 弹出保存对话框, 完成) 显示不定进度. 保存对话框弹出期间进度是 "正在准备".
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ExportProgressStep(
  props: ExportProgressStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const stage = props.progress?.stage ?? "idle";
  const hasCounts = props.progress !== undefined && props.progress.total > 0;
  return (
    <>
      <div className="flex flex-col gap-2" role="status">
        <Progress value={toPercentage(props.progress)}>
          <ProgressLabel>{t(`export.progress.${stage}`)}</ProgressLabel>
        </Progress>
        {hasCounts && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {t("export.progress.counts", {
              processed: props.progress?.processed ?? 0,
              total: props.progress?.total ?? 0,
            })}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={props.onCancel}>
          {t("export.progress.cancel")}
        </Button>
      </DialogFooter>
    </>
  );
}
