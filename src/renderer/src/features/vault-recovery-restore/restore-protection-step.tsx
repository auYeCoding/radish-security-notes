import { useState } from "react";
import { useTranslation } from "react-i18next";

import { GateCard } from "@renderer/components/gate-card";
import { SkipConfirmDialog } from "@renderer/components/skip-confirm-dialog";
import { useVaultOperation } from "@renderer/stores/use-vault-operation";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { describeRestoreFailure } from "./describe-restore-failure";
import { RestoreProtectionForm } from "./restore-protection-form";

/**
 * 恢复后设置新保护步骤的属性.
 */
interface RestoreProtectionStepProps {
  /**
   * 已通过校验的 24 个恢复词.
   */
  readonly words: readonly string[];
}

/**
 * 恢复的第二步: 词已验证, 设置新的主密码, 或确认后改用系统保护. 成功后保险库状态变为已解锁,
 * 由外层切换到三栏主界面; 不生成新恢复词, 原来的词仍然有效.
 * @param props 组件属性.
 * @returns 第二步页面元素.
 */
export function RestoreProtectionStep(
  props: RestoreProtectionStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const restoreWithMasterPassword = useVaultStore(
    (state) => state.restoreWithMasterPassword,
  );
  const restoreWithoutMasterPassword = useVaultStore(
    (state) => state.restoreWithoutMasterPassword,
  );
  const { isPending, failureReason, failureWordPosition, run } =
    useVaultOperation();
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const skip = async (): Promise<void> => {
    const result = await run(() => restoreWithoutMasterPassword(props.words));
    if (!result.ok) {
      setIsSkipDialogOpen(false);
    }
  };
  return (
    <GateCard
      title={t("vault.restore.protection.title")}
      description={t("vault.restore.protection.description")}
    >
      <RestoreProtectionForm
        isPending={isPending}
        alertMessage={describeRestoreFailure(
          failureReason,
          failureWordPosition,
          t,
        )}
        onSubmit={(masterPassword) =>
          void run(() => restoreWithMasterPassword(props.words, masterPassword))
        }
        onSkipRequest={() => setIsSkipDialogOpen(true)}
      />
      <SkipConfirmDialog
        open={isSkipDialogOpen}
        onOpenChange={(open) => !isPending && setIsSkipDialogOpen(open)}
        onConfirm={() => void skip()}
        isPending={isPending}
      />
    </GateCard>
  );
}
