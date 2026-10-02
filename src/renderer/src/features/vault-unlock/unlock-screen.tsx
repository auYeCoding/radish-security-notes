import { useTranslation } from "react-i18next";

import { GateCard } from "@renderer/components/gate-card";
import { Button } from "@renderer/components/ui/button";
import { useVaultOperation } from "@renderer/stores/use-vault-operation";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { UnlockForm } from "./unlock-form";

/**
 * 解锁页: 输入主密码解锁, 表单下方有 "忘记主密码?" 入口, 点后进入凭恢复词恢复的流程. 主密码
 * 不对时在输入框下方提示, 其它失败显示在表单顶部. 解锁成功后保险库状态变为已解锁, 由外层
 * 切换到三栏主界面.
 * @returns 解锁页元素.
 */
export function UnlockScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const unlock = useVaultStore((state) => state.unlock);
  const requestRestore = useVaultStore((state) => state.requestRestore);
  const { isPending, failureReason, run } = useVaultOperation();
  const isWrongPassword = failureReason === "wrong-password";
  const hasOtherFailure = failureReason !== undefined && !isWrongPassword;
  return (
    <GateCard
      title={t("vault.unlock.title")}
      description={t("vault.unlock.description")}
    >
      <UnlockForm
        isPending={isPending}
        fieldError={
          isWrongPassword ? t("vault.unlock.error.wrongPassword") : undefined
        }
        alertMessage={
          hasOtherFailure ? t("vault.unlock.error.unexpected") : undefined
        }
        onSubmit={(masterPassword) => void run(() => unlock(masterPassword))}
      />
      <div className="mt-4 flex justify-center">
        <Button
          type="button"
          variant="link"
          disabled={isPending}
          onClick={requestRestore}
        >
          {t("vault.unlock.forgot")}
        </Button>
      </div>
    </GateCard>
  );
}
