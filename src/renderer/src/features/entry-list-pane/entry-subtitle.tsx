import type { TextRange } from "@shared/search/find-term-ranges";

import { HighlightedText } from "@renderer/components/highlighted-text";

/**
 * 列表项第二行的属性.
 */
interface EntrySubtitleProps {
  /**
   * 当前语言的类型名.
   */
  readonly typeName: string;
  /**
   * 条目的账号, 没有账号字段或没有填写时为空串.
   */
  readonly account: string;
  /**
   * 账号里要高亮的区间.
   */
  readonly accountRanges: readonly TextRange[];
}

/**
 * 类型名与账号之间的分隔符.
 */
const SUBTITLE_SEPARATOR = " · ";

/**
 * 列表项的第二行: "类型名 · 账号", 没有账号时只有类型名, 账号里命中搜索关键字的部分高亮.
 * @param props 组件属性.
 * @returns 第二行元素.
 */
export function EntrySubtitle(props: EntrySubtitleProps): React.JSX.Element {
  return (
    <span className="w-full truncate text-xs font-normal text-muted-foreground">
      {props.typeName}
      {props.account === "" ? null : (
        <>
          {SUBTITLE_SEPARATOR}
          <HighlightedText text={props.account} ranges={props.accountRanges} />
        </>
      )}
    </span>
  );
}
