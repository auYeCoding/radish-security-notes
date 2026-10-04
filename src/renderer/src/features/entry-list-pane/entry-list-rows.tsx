import { useTranslation } from "react-i18next";

import type { EntrySummary } from "@shared/entries/entry-types";

import { EntryListItem } from "./entry-list-item";
import { ROW_CHECKBOX_PROMPT_ID } from "./entry-row-ids";
import type { EntryListChecking } from "./use-entry-list-checking";

/**
 * 条目行列表的属性.
 */
interface EntryListRowsProps {
  /**
   * 要展示的条目, 按显示顺序排列.
   */
  readonly entries: readonly EntrySummary[];
  /**
   * 选中查看详情的条目编号, 没有选中时为 undefined.
   */
  readonly selectedId: string | undefined;
  /**
   * 点击一行选中它时的回调, 引用要稳定.
   */
  readonly onSelect: (id: string) => void;
  /**
   * 勾选相关的状态与回调.
   */
  readonly checking: EntryListChecking;
}

/**
 * 逐项列出条目, 标出选中查看详情的项与已勾选的项. 列表前放一段隐藏的 "选择条目" 提示, 每行的勾选框
 * 用它与条目名称合成无障碍名称.
 * @param props 组件属性.
 * @returns 条目行列表元素.
 */
export function EntryListRows(props: EntryListRowsProps): React.JSX.Element {
  const { t } = useTranslation();
  const { checking } = props;
  return (
    <>
      <span id={ROW_CHECKBOX_PROMPT_ID} hidden>
        {t("batch.rowCheckboxPrompt")}
      </span>
      <ul>
        {props.entries.map((entry) => (
          <EntryListItem
            key={entry.id}
            entry={entry}
            isSelected={entry.id === props.selectedId}
            isChecked={checking.checkedIds.has(entry.id)}
            onSelect={props.onSelect}
            onToggleChecked={checking.toggleChecked}
            onCheckRange={checking.checkRange}
          />
        ))}
      </ul>
    </>
  );
}
