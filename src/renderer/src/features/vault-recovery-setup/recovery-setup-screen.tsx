import { useState } from "react";
import { useTranslation } from "react-i18next";

import { GateCard } from "@renderer/components/gate-card";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { pickConfirmationPositions } from "./recovery-challenge";
import { RecoveryConfirmStep } from "./recovery-confirm-step";
import { RecoveryPrintSheet } from "./recovery-print-sheet";
import { RecoveryWordsStep } from "./recovery-words-step";

/**
 * 恢复词页的属性.
 */
interface RecoverySetupScreenProps {
  /**
   * 刚生成的 24 个恢复词.
   */
  readonly words: readonly string[];
}

/**
 * 设置主密码或跳过之后的恢复词页, 分两步: 先展示 24 个词并提供保存手段, 再让用户重输随机抽出
 * 的 3 个词, 通过后丢弃词并进入三栏主界面. 每次进入确认步骤都重新抽取位置. 打印版式只在
 * 展示步骤存在, 平时隐藏, 只在打印时可见, 确认步骤里页面上没有任何词.
 * @param props 组件属性.
 * @returns 恢复词页元素.
 */
export function RecoverySetupScreen(
  props: RecoverySetupScreenProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const confirmRecoveryWords = useVaultStore(
    (state) => state.confirmRecoveryWords,
  );
  const [positions, setPositions] = useState<readonly number[] | undefined>(
    undefined,
  );
  return (
    <>
      {positions === undefined ? (
        <>
          <GateCard
            size="wide"
            isHiddenOnPrint
            title={t("vault.recovery.show.title")}
            description={t("vault.recovery.show.description")}
          >
            <RecoveryWordsStep
              words={props.words}
              onContinue={() => setPositions(pickConfirmationPositions())}
            />
          </GateCard>
          <RecoveryPrintSheet words={props.words} />
        </>
      ) : (
        <GateCard
          isHiddenOnPrint
          title={t("vault.recovery.confirm.title")}
          description={t("vault.recovery.confirm.description", {
            positions: positions.join(", "),
          })}
        >
          <RecoveryConfirmStep
            words={props.words}
            positions={positions}
            onBack={() => setPositions(undefined)}
            onConfirmed={confirmRecoveryWords}
          />
        </GateCard>
      )}
    </>
  );
}
