import { useTranslation } from "react-i18next";

import { RecoveryWordsDisplay } from "@renderer/components/recovery-words-display";
import { Button } from "@renderer/components/ui/button";
import { useVaultStore } from "@renderer/stores/use-vault-store";

/**
 * 展示步骤的属性.
 */
interface RecoveryWordsStepProps {
  /**
   * 要展示的 24 个恢复词.
   */
  readonly words: readonly string[];
  /**
   * 点击 "我已保存, 继续" 时的回调.
   */
  readonly onContinue: () => void;
}

/**
 * 恢复词展示步骤: 恢复词展示加继续按钮. 没有复制入口, 文本文件经保险库 store 保存.
 * @param props 组件属性.
 * @returns 展示步骤元素.
 */
export function RecoveryWordsStep(
  props: RecoveryWordsStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const saveRecoveryTextFile = useVaultStore(
    (state) => state.saveRecoveryTextFile,
  );
  return (
    <div className="flex flex-col gap-6">
      <RecoveryWordsDisplay
        words={props.words}
        onSaveTextFile={saveRecoveryTextFile}
      />
      <Button type="button" onClick={props.onContinue}>
        {t("vault.recovery.show.continue")}
      </Button>
    </div>
  );
}
