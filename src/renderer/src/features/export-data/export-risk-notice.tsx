import { useTranslation } from "react-i18next";

import { CheckboxField } from "@renderer/components/checkbox-field";
import { WarningAlert } from "@renderer/components/warning-alert";

/**
 * 风险提示的属性.
 */
interface ExportRiskNoticeProps {
  /**
   * 导出文件是否口令加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 是否已勾选 "我了解导出文件是明文".
   */
  readonly hasAcknowledged: boolean;
  /**
   * 勾选或取消勾选的回调.
   */
  readonly onAcknowledgedChange: (hasAcknowledged: boolean) => void;
}

/**
 * 确认步骤里的风险提示: 不加密时是明文风险提示与必须勾选的确认, 加密时是忘记口令无法找回的提示.
 * @param props 组件属性.
 * @returns 风险提示元素.
 */
export function ExportRiskNotice(
  props: ExportRiskNoticeProps,
): React.JSX.Element {
  const { t } = useTranslation();
  if (props.isEncrypted) {
    return (
      <WarningAlert
        title={t("export.confirm.encryptedNotice.title")}
        description={t("export.confirm.encryptedNotice.description")}
      />
    );
  }
  return (
    <>
      <WarningAlert
        title={t("export.confirm.plaintextWarning.title")}
        description={t("export.confirm.plaintextWarning.description")}
      />
      <CheckboxField
        label={t("export.confirm.acknowledge")}
        isChecked={props.hasAcknowledged}
        onCheckedChange={props.onAcknowledgedChange}
      />
    </>
  );
}
