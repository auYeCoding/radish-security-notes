import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldDescription, FieldGroup } from "@renderer/components/ui/field";

import { RecoveryWordInputGrid } from "./recovery-word-input-grid";
import { RecoveryWordsActions } from "./recovery-words-actions";
import { useRecoveryWordsForm } from "./use-recovery-words-form";

/**
 * 恢复词表单的属性.
 */
interface RecoveryWordsFormProps {
  /**
   * 提交 24 个词时的回调.
   */
  readonly onSubmit: (words: string[]) => void;
  /**
   * 点击 "返回" 时的回调.
   */
  readonly onBack: () => void;
  /**
   * 校验是否正在执行, 执行中禁用输入与按钮.
   */
  readonly isPending: boolean;
  /**
   * 校验失败的提示文案, 显示在表单顶部的提示条里.
   */
  readonly alertMessage?: string;
  /**
   * 不在词表的词的序号 (从 1 起), 对应输入框标红.
   */
  readonly invalidPosition?: number;
}

/**
 * 恢复词表单: 24 个输入框, 在任一输入框粘贴整串词时自动分发, 提交与返回按钮. 页面出现时
 * 第一个输入框自动获得焦点.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function RecoveryWordsForm(
  props: RecoveryWordsFormProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { registerWord, submit, distributePaste } = useRecoveryWordsForm(
    props.onSubmit,
  );
  return (
    <form noValidate onSubmit={submit}>
      <FieldGroup>
        {props.alertMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{props.alertMessage}</AlertDescription>
          </Alert>
        )}
        <RecoveryWordInputGrid
          registerWord={registerWord}
          invalidPosition={props.invalidPosition}
          isDisabled={props.isPending}
          onPasteAt={distributePaste}
        />
        <FieldDescription>
          {t("vault.restore.words.pasteHint")}
        </FieldDescription>
        <RecoveryWordsActions
          isPending={props.isPending}
          onBack={props.onBack}
        />
      </FieldGroup>
    </form>
  );
}
