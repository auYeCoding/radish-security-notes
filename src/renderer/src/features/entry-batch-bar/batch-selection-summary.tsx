import { useTranslation } from "react-i18next";

/**
 * 选择栏里选中数量文字的属性.
 */
interface BatchSelectionSummaryProps {
  /**
   * 当前可见且已勾选的条目数.
   */
  readonly count: number;
}

/**
 * 选择栏里的文字: 没有勾选时是 "全选", 勾选后是 "已选 N 项". 带 `aria-live`, 勾选数量变化时屏幕
 * 阅读器会朗读.
 * @param props 组件属性.
 * @returns 文字元素.
 */
export function BatchSelectionSummary(
  props: BatchSelectionSummaryProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <span aria-live="polite" className="truncate text-sm text-muted-foreground">
      {props.count === 0
        ? t("batch.selectAll")
        : t("batch.selectedCount", { count: props.count })}
    </span>
  );
}
