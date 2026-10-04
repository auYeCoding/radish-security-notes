import { useTranslation } from "react-i18next";

import type { SelectAllState } from "@shared/batch/batch-selection";

import { Checkbox } from "@renderer/components/ui/checkbox";

/**
 * 全选框的属性.
 */
interface BatchSelectAllCheckboxProps {
  /**
   * 当前可见的条目一个都没选中, 部分选中或全部选中.
   */
  readonly state: SelectAllState;
  /**
   * 点击全选框时的回调.
   */
  readonly onToggle: () => void;
}

/**
 * 列表窗格选择栏里的全选框: 可见条目全部选中时是选中状态, 部分选中时是半选状态, 点击在全选与
 * 取消全选之间切换.
 * @param props 组件属性.
 * @returns 全选框元素.
 */
export function BatchSelectAllCheckbox(
  props: BatchSelectAllCheckboxProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Checkbox
      aria-label={t("batch.selectAll")}
      checked={props.state === "all"}
      indeterminate={props.state === "some"}
      onCheckedChange={props.onToggle}
    />
  );
}
