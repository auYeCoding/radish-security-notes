import { useTranslation } from "react-i18next";

import type { EntryDetail } from "@shared/entries/entry-types";

import { CopyButton } from "@renderer/components/copy-button";
import { useEntryStore } from "@renderer/stores/use-entry-store";

import { DetailField, NotFilledText } from "./detail-field";
import { DetailPasswordRow } from "./detail-password-row";

/**
 * 条目详情视图的属性.
 */
interface EntryDetailViewProps {
  /**
   * 要展示的条目详情.
   */
  readonly detail: EntryDetail;
}

/**
 * 已选中条目的详情: 标题是名称, 下方依次是账号与密码, 每项带复制按钮. 复制由主进程写入
 * 剪贴板. 调用方用条目编号作 key, 切换条目时密码的显示状态随之恢复为遮罩.
 * @param props 组件属性.
 * @returns 详情视图元素.
 */
export function EntryDetailView(
  props: EntryDetailViewProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const copyField = useEntryStore((state) => state.copyField);
  const { detail } = props;
  return (
    <div className="flex flex-col gap-6 p-8">
      <h2 className="text-xl font-semibold break-words">{detail.name}</h2>
      <dl className="flex max-w-xl flex-col gap-4">
        <DetailField
          label={t("entryDetail.account")}
          actions={
            <CopyButton
              label={t("entryDetail.copyAccount")}
              copiedLabel={t("entryDetail.copied")}
              onCopy={() => copyField(detail.id, "account")}
              isDisabled={detail.account === ""}
            />
          }
        >
          {detail.account === "" ? <NotFilledText /> : detail.account}
        </DetailField>
        <DetailPasswordRow
          password={detail.password}
          onCopy={() => copyField(detail.id, "password")}
        />
      </dl>
    </div>
  );
}
