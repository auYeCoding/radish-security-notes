import { useTranslation } from "react-i18next";

import { GateCard } from "@renderer/components/gate-card";
import { useVaultOperation } from "@renderer/stores/use-vault-operation";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { describeRestoreFailure } from "./describe-restore-failure";
import { RecoveryWordsForm } from "./recovery-words-form";

/**
 * 输入恢复词步骤的属性.
 */
interface RestoreWordsStepProps {
  /**
   * 校验通过后的回调, 参数是用户输入的 24 个词.
   */
  readonly onVerified: (words: readonly string[]) => void;
}

/**
 * 恢复的第一步: 输入 24 个恢复词, 提交后由主进程校验词表, 校验和并确认能打开数据库. 校验
 * 不通过时提示原因, 词不在词表时标出第几个词; 可以返回解锁页或失败页.
 * @param props 组件属性.
 * @returns 第一步页面元素.
 */
export function RestoreWordsStep(
  props: RestoreWordsStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const verifyRecoveryWords = useVaultStore(
    (state) => state.verifyRecoveryWords,
  );
  const cancelRestore = useVaultStore((state) => state.cancelRestore);
  const { isPending, failureReason, failureWordPosition, run } =
    useVaultOperation();
  const verify = async (words: string[]): Promise<void> => {
    const result = await run(() => verifyRecoveryWords(words));
    if (result.ok) {
      props.onVerified(words);
    }
  };
  return (
    <GateCard
      size="wide"
      title={t("vault.restore.words.title")}
      description={t("vault.restore.words.description")}
    >
      <RecoveryWordsForm
        isPending={isPending}
        alertMessage={describeRestoreFailure(
          failureReason,
          failureWordPosition,
          t,
        )}
        invalidPosition={
          failureReason === "recovery-unknown-word"
            ? failureWordPosition
            : undefined
        }
        onSubmit={(words) => void verify(words)}
        onBack={cancelRestore}
      />
    </GateCard>
  );
}
