import { cn } from "cn";

import type { EntrySummary } from "@shared/entries/entry-types";

import { Button } from "@renderer/components/ui/button";

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
   * 点击列表项时的回调, 参数是条目编号.
   */
  readonly onSelect: (id: string) => void;
}

/**
 * 条目列表里的一项: 第一行名称, 第二行账号. 选中项除底色外, 起始侧还有强调色竖条,
 * 并标记为当前项, 状态不只靠颜色区分.
 * @param props 组件属性.
 * @returns 列表项元素.
 */
export function EntryListItem(props: EntryListItemProps): React.JSX.Element {
  const { entry, isSelected, onSelect } = props;
  return (
    <li>
      <Button
        variant="ghost"
        aria-current={isSelected ? "true" : undefined}
        onClick={() => onSelect(entry.id)}
        className={cn(
          "h-(--list-row-height) w-full flex-col items-start justify-center gap-0.5 rounded-none border-0 border-s-2 border-s-transparent px-4 text-start",
          isSelected && "border-s-brand bg-muted",
        )}
      >
        <span className="w-full truncate text-sm font-semibold">
          {entry.name}
        </span>
        <span className="w-full truncate text-xs font-normal text-muted-foreground">
          {entry.account}
        </span>
      </Button>
    </li>
  );
}
