import { memo } from "react";
import { useTranslation } from "react-i18next";

import type { EntrySummary } from "@shared/entries/entry-types";

import { HighlightedText } from "@renderer/components/highlighted-text";

import { EntryHitLine } from "./entry-hit-line";
import { entryNameElementId } from "./entry-row-ids";
import { EntrySubtitle } from "./entry-subtitle";
import { useEntryHighlights } from "./use-entry-highlights";

/**
 * 列表项文字部分的属性.
 */
interface EntryRowContentProps {
  /**
   * 要展示的条目摘要.
   */
  readonly entry: EntrySummary;
}

/**
 * 列表项里的文字部分: 第一行名称, 第二行 "类型名 · 账号", 没有账号时只有类型名; 条目在最近一次搜索
 * 里命中时, 名称与账号里命中关键字的部分高亮, 条目在其它字段命中时第三行写 "命中: 字段名". 用
 * `memo` 包住: 列表项只是勾选状态变化时 (例如全选), 文字部分不用跟着重新渲染.
 * @param props 组件属性.
 * @returns 文字部分元素.
 */
export const EntryRowContent = memo(function EntryRowContent(
  props: EntryRowContentProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { entry } = props;
  const { hitFields, nameRanges, accountRanges } = useEntryHighlights(entry);
  return (
    <>
      <span
        id={entryNameElementId(entry.id)}
        className="w-full truncate text-sm font-semibold"
      >
        <HighlightedText text={entry.name} ranges={nameRanges} />
      </span>
      <EntrySubtitle
        typeName={t(`entryTypes.${entry.type}`)}
        account={entry.account}
        accountRanges={accountRanges}
      />
      {hitFields === undefined ? null : <EntryHitLine fields={hitFields} />}
    </>
  );
});
