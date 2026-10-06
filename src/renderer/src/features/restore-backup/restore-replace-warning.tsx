import { useTranslation } from "react-i18next";

import type { RestoreVaultState } from "@shared/restore/restore-types";

import { CheckboxField } from "@renderer/components/checkbox-field";
import { WarningAlert } from "@renderer/components/warning-alert";

/**
 * 清空警示的属性.
 */
interface RestoreReplaceWarningProps {
  /**
   * 保险库里现有内容的个数.
   */
  readonly vault: RestoreVaultState;
  /**
   * 是否已勾选 "我明白这些数据将被永久删除".
   */
  readonly hasAcknowledged: boolean;
  /**
   * 勾选或取消勾选的回调.
   */
  readonly onAcknowledgedChange: (hasAcknowledged: boolean) => void;
}

/**
 * 保险库非空时的清空警示: 现有内容的个数, 恢复会先永久删除它们, 以及必须勾选的确认.
 * @param props 组件属性.
 * @returns 警示与确认元素.
 */
export function RestoreReplaceWarning(
  props: RestoreReplaceWarningProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { vault } = props;
  return (
    <>
      <WarningAlert
        variant="destructive"
        title={t("restore.replace.title")}
        description={t("restore.replace.description", {
          entries: vault.entryCount,
          attachments: vault.attachmentCount,
          folders: vault.folderCount,
          tags: vault.tagCount,
          customTypes: vault.customTypeCount,
        })}
      />
      <CheckboxField
        label={t("restore.replace.acknowledge")}
        isChecked={props.hasAcknowledged}
        onCheckedChange={props.onAcknowledgedChange}
      />
    </>
  );
}
