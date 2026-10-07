import { FileText, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import { FieldDescription } from "@renderer/components/ui/field";

import {
  useRecoveryTextSave,
  type SaveRecoveryTextFile,
} from "./use-recovery-text-save";

/**
 * 保存手段按钮区的属性.
 */
interface RecoverySaveActionsProps {
  /**
   * 要保存的 24 个恢复词.
   */
  readonly words: readonly string[];
  /**
   * 把恢复词保存为文本文件的函数, 由调用方提供.
   */
  readonly onSaveTextFile: SaveRecoveryTextFile;
}

/**
 * 恢复词的保存手段: "打印恢复套件" 与 "保存为文本文件". 不提供复制到剪贴板. 文本文件是明文,
 * 按钮下方常驻说明它会被同步, 备份与云盘带走.
 * @param props 组件属性.
 * @returns 保存手段按钮区元素.
 */
export function RecoverySaveActions(
  props: RecoverySaveActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { state, save } = useRecoveryTextSave(
    props.words,
    props.onSaveTextFile,
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer />
          {t("vault.recovery.save.print")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={state === "pending"}
          onClick={() => void save()}
        >
          <FileText />
          {t("vault.recovery.save.textFile")}
        </Button>
      </div>
      <FieldDescription>
        {t("vault.recovery.save.textFileWarning")}
      </FieldDescription>
      {state === "saved" && (
        <p role="status" className="text-xs text-brand">
          {t("vault.recovery.save.saved")}
        </p>
      )}
      {state === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          {t("vault.recovery.save.failed")}
        </p>
      )}
    </div>
  );
}
