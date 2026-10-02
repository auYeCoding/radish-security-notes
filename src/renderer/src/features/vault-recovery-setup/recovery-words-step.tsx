import { useTranslation } from "react-i18next";

import { NumberedWordGrid } from "@renderer/components/numbered-word-grid";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { Button } from "@renderer/components/ui/button";
import { FieldDescription } from "@renderer/components/ui/field";
import { RECOVERY_WORD_COUNT } from "@shared/vault/recovery-words";

import { RecoverySaveActions } from "./recovery-save-actions";

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
 * 恢复词展示步骤: 泄露警示, 带序号的 24 个词, 保存手段与继续按钮. 没有复制入口.
 * @param props 组件属性.
 * @returns 展示步骤元素.
 */
export function RecoveryWordsStep(
  props: RecoveryWordsStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <Alert role="note">
        <AlertDescription>{t("vault.recovery.warning")}</AlertDescription>
      </Alert>
      <NumberedWordGrid
        label={t("vault.recovery.wordsLabel")}
        count={RECOVERY_WORD_COUNT}
        renderCell={(position) => (
          <span className="font-mono text-sm text-foreground">
            {props.words[position - 1]}
          </span>
        )}
      />
      <FieldDescription>{t("vault.recovery.show.noCopy")}</FieldDescription>
      <RecoverySaveActions words={props.words} />
      <Button type="button" onClick={props.onContinue}>
        {t("vault.recovery.show.continue")}
      </Button>
    </div>
  );
}
