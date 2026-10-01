import { useTranslation } from "react-i18next";

import { GateCard } from "@renderer/components/gate-card";

/**
 * 保险库无法打开时的页面: 说明原因与下一步, 不提供任何会改动文件的操作.
 * @returns 失败页元素.
 */
export function VaultFailureScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <GateCard
      title={t("vault.failure.title")}
      description={t("vault.failure.description")}
    />
  );
}
