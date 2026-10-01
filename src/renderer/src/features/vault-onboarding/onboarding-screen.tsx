import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { GateCard } from "@renderer/components/gate-card";
import { useVaultOperation } from "@renderer/stores/use-vault-operation";
import { useVaultStore } from "@renderer/stores/use-vault-store";
import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

import { OnboardingForm } from "./onboarding-form";
import { SkipConfirmDialog } from "./skip-confirm-dialog";

/**
 * 把设置失败的原因换成提示条里的文案.
 * @param reason 失败原因, 没有失败时为 undefined.
 * @param translate 翻译函数.
 * @returns 提示文案, 没有失败时为 undefined.
 */
function describeSetupFailure(
  reason: VaultFailureReason | undefined,
  translate: TFunction,
): string | undefined {
  if (reason === undefined) {
    return undefined;
  }
  return reason === "system-protection-unavailable"
    ? translate("vault.onboarding.error.systemUnavailable")
    : translate("vault.onboarding.error.unexpected");
}

/**
 * 首次启动的引导页: 设置主密码, 或确认后跳过. 设置成功后保险库状态变为已解锁, 由外层
 * 切换到三栏主界面.
 * @returns 引导页元素.
 */
export function OnboardingScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const setupWithMasterPassword = useVaultStore(
    (state) => state.setupWithMasterPassword,
  );
  const setupWithoutMasterPassword = useVaultStore(
    (state) => state.setupWithoutMasterPassword,
  );
  const { isPending, failureReason, run } = useVaultOperation();
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);

  const skip = async (): Promise<void> => {
    const result = await run(setupWithoutMasterPassword);
    if (!result.ok) {
      setIsSkipDialogOpen(false);
    }
  };

  return (
    <GateCard
      title={t("vault.onboarding.title")}
      description={t("vault.onboarding.description")}
    >
      <OnboardingForm
        isPending={isPending}
        alertMessage={describeSetupFailure(failureReason, t)}
        onSubmit={(masterPassword) =>
          void run(() => setupWithMasterPassword(masterPassword))
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
