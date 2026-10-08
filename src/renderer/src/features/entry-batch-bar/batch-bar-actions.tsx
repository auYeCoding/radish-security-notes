import { ArrowLeftRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FADE_IN_MOTION } from "@renderer/components/ui/state-motion";
import { cn } from "@renderer/lib/class-names";
import { useBatchOperations } from "@renderer/stores/use-batch-operations";

import { BatchActionButton } from "./batch-action-button";
import { BatchDeleteButton } from "./batch-delete-button";
import { BatchMoveMenu } from "./batch-move-menu";
import { BatchTagMenu } from "./batch-tag-menu";
import type { BatchRun } from "./use-batch-run";

/**
 * 批量操作按钮组的属性.
 */
interface BatchBarActionsProps {
  /**
   * 要操作的条目编号, 是当前可见且已勾选的条目.
   */
  readonly entryIds: readonly string[];
  /**
   * 批量操作是否正在执行, 执行期间按钮禁用.
   */
  readonly isRunning: boolean;
  /**
   * 执行一次批量操作并跟踪它的状态.
   */
  readonly run: BatchRun["run"];
  /**
   * 点反选按钮时的回调.
   */
  readonly onInvert: () => void;
}

/**
 * 选择栏右侧的批量操作按钮组: 移入文件夹, 加标签, 摘标签, 反选与删除. 移入文件夹与标签的菜单点一项
 * 就对选中的条目执行, 删除先经确认框. 勾选第一项时整组快档淡入出现.
 * @param props 组件属性.
 * @returns 按钮组元素.
 */
export function BatchBarActions(
  props: BatchBarActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const operations = useBatchOperations();
  const { entryIds, isRunning, run } = props;
  return (
    <div className={cn(FADE_IN_MOTION, "ms-auto flex items-center gap-0.5")}>
      <BatchMoveMenu
        isDisabled={isRunning}
        onMove={(folderId) =>
          void run(() => operations.moveEntries(entryIds, folderId))
        }
      />
      <BatchTagMenu
        mode="add"
        isDisabled={isRunning}
        onChoose={(tagId) => void run(() => operations.addTag(entryIds, tagId))}
      />
      <BatchTagMenu
        mode="remove"
        isDisabled={isRunning}
        onChoose={(tagId) =>
          void run(() => operations.removeTag(entryIds, tagId))
        }
      />
      <BatchActionButton
        label={t("batch.invert")}
        icon={<ArrowLeftRightIcon aria-hidden="true" />}
        isDisabled={isRunning}
        onClick={props.onInvert}
      />
      <BatchDeleteButton entryIds={entryIds} isDisabled={isRunning} />
    </div>
  );
}
