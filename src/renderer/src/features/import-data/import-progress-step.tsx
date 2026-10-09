import { useTranslation } from "react-i18next";

import type { ImportProgressSnapshot } from "@shared/import/import-types";

import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";
import { Progress, ProgressLabel } from "@renderer/components/ui/progress";

/**
 * 处理中步骤的属性.
 */
interface ImportProgressStepProps {
  /**
   * 最近一次读到的进度, 还没读到时为 undefined.
   */
  readonly progress: ImportProgressSnapshot | undefined;
  /**
   * 点取消时的回调, 写库阶段不能取消, 此时为 undefined 不显示取消按钮.
   */
  readonly onCancel: (() => void) | undefined;
}

/**
 * 进度百分比, 阶段没有细分进度 (总数为 0) 时为 null, 进度条显示为不定进度.
 * @param progress 进度快照.
 * @returns 0 到 100 的百分比, 或 null.
 */
function toPercentage(
  progress: ImportProgressSnapshot | undefined,
): number | null {
  if (progress === undefined || progress.total === 0) {
    return null;
  }
  return Math.min(100, (progress.processed / progress.total) * 100);
}

/**
 * 主进程处理中的步骤: 阶段名称, 进度条与已处理的个数, 选择与解析阶段带取消按钮. 进度由轮询读到,
 * 没有细分进度的阶段 (读取文件, 写库) 显示不定进度.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ImportProgressStep(
  props: ImportProgressStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const stage = props.progress?.stage ?? "idle";
  const hasCounts = props.progress !== undefined && props.progress.total > 0;
  return (
    <>
      <DialogScrollBody className="gap-2" role="status">
        <Progress value={toPercentage(props.progress)}>
          <ProgressLabel>{t(`import.progress.${stage}`)}</ProgressLabel>
        </Progress>
        {hasCounts && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {t("import.progress.counts", {
              processed: props.progress?.processed ?? 0,
              total: props.progress?.total ?? 0,
            })}
          </p>
        )}
      </DialogScrollBody>
      {props.onCancel !== undefined && (
        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel}>
            {t("import.progress.cancel")}
          </Button>
        </DialogFooter>
      )}
    </>
  );
}
