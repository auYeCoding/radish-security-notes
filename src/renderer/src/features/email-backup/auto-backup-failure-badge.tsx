import { useTranslation } from "react-i18next";

import { Badge } from "@renderer/components/ui/badge";

/**
 * 自动备份失败标记: 一枚红色标记, 靠右放在所在按钮的末尾. 只负责显示, 是否显示由调用方依据
 * `useAutoBackupFailure` 的结果决定.
 * @returns 失败标记元素.
 */
export function AutoBackupFailureBadge(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Badge variant="destructive" className="ml-auto">
      {t("emailBackup.trigger.failureBadge")}
    </Badge>
  );
}
