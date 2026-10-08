import { cn } from "cn";
import { memo, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import type { EntrySummary } from "@shared/entries/entry-types";

import { Button } from "@renderer/components/ui/button";
import { Checkbox } from "@renderer/components/ui/checkbox";
import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";
import { useDragSource } from "@renderer/lib/drag-drop/use-drag-source";

import { EntryRowContent } from "./entry-row-content";
import { intentOfRowClick } from "./entry-row-click";
import { rowCheckboxLabelledBy } from "./entry-row-ids";

/**
 * 列表项外层的类名. 类名在模块加载时合并好, 渲染时直接取用: 条目很多时全选会让每个列表项重新
 * 渲染, 每次都合并类名开销不小. 选中竖条与底色的出现和消失取快档状态过渡.
 */
const ROW_CLASS_NAME = cn(
  FAST_STATE_TRANSITION,
  "flex h-(--list-row-height) items-center border-s-2 border-s-transparent",
);

/**
 * 选中查看详情的列表项外层的类名.
 */
const SELECTED_ROW_CLASS_NAME = cn(ROW_CLASS_NAME, "border-s-brand bg-muted");

/**
 * 列表项按钮的类名.
 */
const BUTTON_CLASS_NAME =
  "h-full min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-none border-0 ps-2 pe-4 text-start";

/**
 * 正被拖拽的列表项按钮的类名.
 */
const DRAGGING_BUTTON_CLASS_NAME = cn(BUTTON_CLASS_NAME, "opacity-50");

/**
 * 列表项的属性.
 */
interface EntryListItemProps {
  /**
   * 要展示的条目摘要.
   */
  readonly entry: EntrySummary;
  /**
   * 条目当前是否被选中查看详情.
   */
  readonly isSelected: boolean;
  /**
   * 条目当前是否被勾选, 即在批量选中里. 与是否被选中查看详情互相独立.
   */
  readonly isChecked: boolean;
  /**
   * 点击列表项时的回调, 参数是条目编号. 要保持引用稳定, 列表项才不会在无关的状态变化时重新渲染.
   */
  readonly onSelect: (id: string) => void;
  /**
   * 切换条目勾选状态时的回调, 参数是条目编号. 要保持引用稳定.
   */
  readonly onToggleChecked: (id: string) => void;
  /**
   * 按住 Shift 点击列表项时的回调, 参数是条目编号, 用来连选区间. 要保持引用稳定.
   */
  readonly onCheckRange: (id: string) => void;
}

/**
 * 条目列表里的一项: 起始侧是勾选框, 之后是名称, 类型与账号等文字. 单击行选中它查看详情; 按住 Ctrl
 * 或 Meta 单击切换勾选, 按住 Shift 单击连选区间, 这两种点击不改变查看详情的条目; 勾选框也切换
 * 勾选. 选中项除底色外, 起始侧还有强调色竖条, 并标记为当前项, 状态不只靠颜色区分. 列表项可以拖到
 * 左侧栏的文件夹上, 鼠标移动一小段距离后才算拖拽, 单击仍是选中; 正被拖拽时原位置变淡.
 * @param props 组件属性.
 * @returns 列表项元素.
 */
export const EntryListItem = memo(function EntryListItem(
  props: EntryListItemProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { entry, isSelected, isChecked } = props;
  const { setNodeRef, dragProps, isDragging } = useDragSource(
    entry.id,
    t("dragDrop.roleDescription"),
  );
  const handleClick = (event: MouseEvent): void => {
    const intent = intentOfRowClick(event);
    if (intent === "toggle") {
      props.onToggleChecked(entry.id);
    } else if (intent === "range") {
      props.onCheckRange(entry.id);
    } else {
      props.onSelect(entry.id);
    }
  };
  return (
    <li className={isSelected ? SELECTED_ROW_CLASS_NAME : ROW_CLASS_NAME}>
      <span className="ps-3 pe-1">
        <Checkbox
          aria-labelledby={rowCheckboxLabelledBy(entry.id)}
          checked={isChecked}
          onCheckedChange={() => props.onToggleChecked(entry.id)}
        />
      </span>
      <Button
        ref={setNodeRef}
        {...dragProps}
        variant="ghost"
        aria-current={isSelected ? "true" : undefined}
        onClick={handleClick}
        className={isDragging ? DRAGGING_BUTTON_CLASS_NAME : BUTTON_CLASS_NAME}
      >
        <EntryRowContent entry={entry} />
      </Button>
    </li>
  );
});
