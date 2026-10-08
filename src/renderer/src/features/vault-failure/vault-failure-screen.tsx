import { useTranslation } from "react-i18next";

import type { VaultFailureCause } from "@shared/vault/vault-failure";

import { GateCard } from "@renderer/components/gate-card";
import { Button } from "@renderer/components/ui/button";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { VaultFailureDiagnostics } from "./vault-failure-diagnostics";

/**
 * 每种失败原因对应的说明文案键. 没有记录或原因是意外失败时用通用说明.
 */
const CAUSE_DESCRIPTION_KEYS = {
  "key-file-missing": "vault.failure.cause.keyFileMissing",
  "database-missing": "vault.failure.cause.databaseMissing",
  "database-unreadable": "vault.failure.cause.databaseUnreadable",
  unexpected: "vault.failure.description",
} as const satisfies Record<VaultFailureCause, string>;

/**
 * 保险库无法打开时的页面: 按失败原因说明缺了什么, 该怎么办, 并给出可复制的诊断信息. 唯一的操作是
 * "用恢复词恢复", 它进入凭恢复词重建密钥文件的流程, 不直接改动任何文件. 应用不会为缺失的文件新建
 * 空文件.
 * @returns 失败页元素.
 */
export function VaultFailureScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const requestRestore = useVaultStore((state) => state.requestRestore);
  const failure = useVaultStore((state) => state.failure);
  const cause = failure?.cause ?? "unexpected";
  return (
    <GateCard
      title={t("vault.failure.title")}
      description={t(CAUSE_DESCRIPTION_KEYS[cause])}
    >
      <Button type="button" variant="outline" onClick={requestRestore}>
        {t("vault.failure.restore")}
      </Button>
      {failure !== undefined && <VaultFailureDiagnostics failure={failure} />}
    </GateCard>
  );
}
