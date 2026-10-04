import { cn } from "cn";
import { memo } from "react";
import { useTranslation } from "react-i18next";

import type { EntrySummary } from "@shared/entries/entry-types";

import { HighlightedText } from "@renderer/components/highlighted-text";
import { Button } from "@renderer/components/ui/button";
import { useDragSource } from "@renderer/lib/drag-drop/use-drag-source";

import { EntryHitLine } from "./entry-hit-line";
import { EntrySubtitle } from "./entry-subtitle";
import { useEntryHighlights } from "./use-entry-highlights";

/**
 * 列表项的属性.
 */
interface EntryListItemProps {
  /**
   * 要展示的条目摘要.
   */
  readonly entry: EntrySummary;
  /**
   * 条目当前是否被选中.
   */
  readonly isSelected: boolean;
  /**
   * 点击列表项时的回调, 参数是条目编号. 要保持引用稳定, 列表项才不会在无关的状态变化时重新渲染.
   */
  readonly onSelect: (id: string) => void;
}

/**
 * 条目列表里的一项: 第一行名称, 第二行 "类型名 · 账号", 没有账号时只有类型名; 条目在最近一次搜索里
 * 命中时, 名称与账号里命中关键字的部分高亮, 条目在其它字段命中时第三行写 "命中: 字段名". 选中项除
 * 底色外, 起始侧还有强调色竖条, 并标记为当前项, 状态不只靠颜色区分. 列表项可以拖到左侧栏的文件夹
 * 上, 鼠标移动一小段距离后才算拖拽, 单击仍是选中; 正被拖拽时原位置变淡.
 * @param props 组件属性.
 * @returns 列表项元素.
 */
export const EntryListItem = memo(function EntryListItem(
  props: EntryListItemProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { entry, isSelected, onSelect } = props;
  const { hitFields, nameRanges, accountRanges } = useEntryHighlights(entry);
  const { setNodeRef, dragProps, isDragging } = useDragSource(
    entry.id,
    t("dragDrop.roleDescription"),
  );
  return (
    <li>
      <Button
        ref={setNodeRef}
        {...dragProps}
        variant="ghost"
        aria-current={isSelected ? "true" : undefined}
        onClick={() => onSelect(entry.id)}
        className={cn(
          "h-(--list-row-height) w-full flex-col items-start justify-center gap-0.5 rounded-none border-0 border-s-2 border-s-transparent px-4 text-start",
          isSelected && "border-s-brand bg-muted",
          isDragging && "opacity-50",
        )}
      >
        <span className="w-full truncate text-sm font-semibold">
          <HighlightedText text={entry.name} ranges={nameRanges} />
        </span>
        <EntrySubtitle
          typeName={t(`entryTypes.${entry.type}`)}
          account={entry.account}
          accountRanges={accountRanges}
        />
        {hitFields === undefined ? null : <EntryHitLine fields={hitFields} />}
      </Button>
    </li>
  );
});
