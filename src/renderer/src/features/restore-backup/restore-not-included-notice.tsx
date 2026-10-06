import { useTranslation } from "react-i18next";

import { WarningAlert } from "@renderer/components/warning-alert";

/**
 * 不在备份里的内容的提示: 邮箱设置, 授权码, 主密码等不会被恢复, 要重新设置. 选择文件的步骤与结果页
 * 共用.
 * @returns 提示元素.
 */
export function RestoreNotIncludedNotice(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <WarningAlert
      title={t("restore.notIncluded.title")}
      description={t("restore.notIncluded.body")}
    />
  );
}
