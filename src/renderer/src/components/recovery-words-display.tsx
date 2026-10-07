import { useTranslation } from "react-i18next";

import { NumberedWordGrid } from "@renderer/components/numbered-word-grid";
import { RecoverySaveActions } from "@renderer/components/recovery-save-actions";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldDescription } from "@renderer/components/ui/field";
import type { SaveRecoveryTextFile } from "@renderer/components/use-recovery-text-save";
import { RECOVERY_WORD_COUNT } from "@shared/vault/recovery-words";

/**
 * 恢复词展示的属性.
 */
interface RecoveryWordsDisplayProps {
  /**
   * 要展示的 24 个恢复词.
   */
  readonly words: readonly string[];
  /**
   * 把恢复词保存为文本文件的函数, 由调用方提供.
   */
  readonly onSaveTextFile: SaveRecoveryTextFile;
}

/**
 * 恢复词的展示: 泄露警示, 带序号的 24 个词, 不提供复制的说明与保存手段. 首次设置的展示步骤与
 * 设置里的查看共用, 没有复制入口.
 * @param props 组件属性.
 * @returns 恢复词展示元素.
 */
export function RecoveryWordsDisplay(
  props: RecoveryWordsDisplayProps,
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
      <RecoverySaveActions
        words={props.words}
        onSaveTextFile={props.onSaveTextFile}
      />
    </div>
  );
}
