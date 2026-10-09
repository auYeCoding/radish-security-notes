import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { EntryDetail } from "@shared/entries/entry-types";

import type { EntrySelection } from "@renderer/stores/entry-state";
import { useEntryStore } from "@renderer/stores/use-entry-store";

import { EntryDetailSkeleton } from "./entry-detail-skeleton";
import { EntryDetailView } from "./entry-detail-view";

/**
 * 条目详情窗格的属性.
 */
interface EntryDetailPaneProps {
  /**
   * 生成标题行右侧操作的函数, 例如编辑与删除按钮. 由 app 层传入, feature 之间不互相引用.
   */
  readonly renderActions?: (detail: EntryDetail) => ReactNode;
  /**
   * 生成备注之后的附件区的函数. 由 app 层传入, feature 之间不互相引用.
   */
  readonly renderAttachments?: (detail: EntryDetail) => ReactNode;
}

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
 * 按选中状态选出详情窗格的内容: 没有选中时提示选择, 读取中显示骨架, 读取失败时说明原因,
 * 读取完成后显示详情. 详情视图以条目编号与编辑次数作 key, 切换条目或保存编辑后重新挂载.
 * @param selection 当前选中状态.
 * @param revision 条目被编辑保存的次数.
 * @param translate 翻译函数.
 * @param renderers 生成标题行右侧操作与备注之后附件区的函数.
 * @returns 窗格内容.
 */
function renderSelection(
  selection: EntrySelection,
  revision: number,
  translate: TFunction,
  renderers: Pick<EntryDetailPaneProps, "renderActions" | "renderAttachments">,
): React.JSX.Element {
  switch (selection.status) {
    case "none":
      return <CenteredMessage message={translate("entryDetailPane.empty")} />;
    case "loading":
      return <EntryDetailSkeleton />;
    case "failed":
      return (
        <CenteredMessage message={translate("entryDetailPane.loadFailed")} />
      );
    default:
      return (
        <EntryDetailView
          key={`${selection.detail.id}:${revision}`}
          detail={selection.detail}
          actions={renderers.renderActions?.(selection.detail)}
          attachments={renderers.renderAttachments?.(selection.detail)}
        />
      );
  }
}

/**
 * 右侧的条目详情窗格, 内容随选中的条目变化.
 * @param props 组件属性.
 * @returns 条目详情窗格元素.
 */
export function EntryDetailPane(
  props: EntryDetailPaneProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const selection = useEntryStore((state) => state.selection);
  const revision = useEntryStore((state) => state.detailRevision);
  return (
    <section
      aria-label={t("entryDetailPane.heading")}
      className="flex min-w-0 flex-1 flex-col overflow-y-auto"
    >
      {renderSelection(selection, revision, t, props)}
    </section>
  );
}
