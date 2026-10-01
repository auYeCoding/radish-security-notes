import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { EntrySelection } from "@renderer/stores/entry-state";
import { useEntryStore } from "@renderer/stores/use-entry-store";

import { EntryDetailView } from "./entry-detail-view";

/**
 * 窗格中央辅助文字的属性.
 */
interface CenteredMessageProps {
  /**
   * 要显示的文字.
   */
  readonly message: string;
}

/**
 * 在窗格中央显示一行辅助文字.
 * @param props 组件属性.
 * @returns 辅助文字元素.
 */
function CenteredMessage(props: CenteredMessageProps): React.JSX.Element {
  return (
    <p className="m-auto text-sm text-muted-foreground">{props.message}</p>
  );
}

/**
 * 按选中状态选出详情窗格的内容: 没有选中时提示选择, 读取中不显示内容, 读取失败时说明原因,
 * 读取完成后显示详情.
 * @param selection 当前选中状态.
 * @param translate 翻译函数.
 * @returns 窗格内容, 读取中时为 null.
 */
function renderSelection(
  selection: EntrySelection,
  translate: TFunction,
): React.JSX.Element | null {
  switch (selection.status) {
    case "none":
      return <CenteredMessage message={translate("entryDetailPane.empty")} />;
    case "loading":
      return null;
    case "failed":
      return (
        <CenteredMessage message={translate("entryDetailPane.loadFailed")} />
      );
    default:
      return (
        <EntryDetailView key={selection.detail.id} detail={selection.detail} />
      );
  }
}

/**
 * 右侧的条目详情窗格, 内容随选中的条目变化.
 * @returns 条目详情窗格元素.
 */
export function EntryDetailPane(): React.JSX.Element {
  const { t } = useTranslation();
  const selection = useEntryStore((state) => state.selection);
  return (
    <section
      aria-label={t("entryDetailPane.heading")}
      className="flex min-w-0 flex-1 flex-col overflow-y-auto"
    >
      {renderSelection(selection, t)}
    </section>
  );
}
