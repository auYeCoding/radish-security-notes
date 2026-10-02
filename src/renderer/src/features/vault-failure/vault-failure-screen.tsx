import { useTranslation } from "react-i18next";

import { GateCard } from "@renderer/components/gate-card";
import { Button } from "@renderer/components/ui/button";
import { useVaultStore } from "@renderer/stores/use-vault-store";

/**
 * 保险库无法打开时的页面: 说明原因与下一步, 唯一的操作是 "用恢复词恢复", 它进入凭恢复词
 * 重建密钥文件的流程, 不直接改动任何文件.
 * @returns 失败页元素.
 */
export function VaultFailureScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const requestRestore = useVaultStore((state) => state.requestRestore);
  return (
    <GateCard
      title={t("vault.failure.title")}
      description={t("vault.failure.description")}
    >
      <Button type="button" variant="outline" onClick={requestRestore}>
        {t("vault.failure.restore")}
      </Button>
    </GateCard>
  );
}
