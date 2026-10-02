import { useEffect, type ClipboardEvent, type FormEvent } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";

import { RECOVERY_WORD_COUNT } from "@shared/vault/recovery-words";

import { distributePastedWords } from "./distribute-pasted-words";

/**
 * 恢复词表单的取值.
 */
interface RecoveryWordsFormValues {
  /**
   * 按序号排列的 24 个输入框的内容.
   */
  words: string[];
}

/**
 * 恢复词表单交给界面使用的部分.
 */
export interface RecoveryWordsFormControls {
  /**
   * 给第几个输入框 (从 0 起) 取接入表单库的注册结果.
   */
  readonly registerWord: (index: number) => UseFormRegisterReturn;
  /**
   * 提交表单的处理函数.
   */
  readonly submit: (event: FormEvent<HTMLFormElement>) => void;
  /**
   * 在第几个输入框 (从 0 起) 粘贴时的处理函数: 粘贴整串词时分发到各输入框.
   */
  readonly distributePaste: (
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) => void;
}

/**
 * 恢复词表单的初始取值: 24 个空输入框.
 */
const EMPTY_VALUES: RecoveryWordsFormValues = {
  words: Array.from({ length: RECOVERY_WORD_COUNT }, () => ""),
};

/**
 * 管理恢复词表单: 24 个输入框, 在任一输入框粘贴整串词时自动分发. 页面出现时第一个输入框
 * 自动获得焦点.
 * @param onSubmit 提交 24 个词时的回调.
 * @returns 注册函数, 提交与粘贴的处理函数.
 */
export function useRecoveryWordsForm(
  onSubmit: (words: string[]) => void,
): RecoveryWordsFormControls {
  const { register, handleSubmit, getValues, setValue, setFocus } =
    useForm<RecoveryWordsFormValues>({ defaultValues: EMPTY_VALUES });
  useEffect(() => {
    setFocus("words.0");
  }, [setFocus]);
  return {
    registerWord: (index) => register(`words.${index}`),
    submit: (event) =>
      void handleSubmit((values) => onSubmit(values.words))(event),
    distributePaste: (index, event) => {
      const distributed = distributePastedWords(
        getValues("words"),
        index,
        event.clipboardData.getData("text"),
      );
      if (distributed !== undefined) {
        event.preventDefault();
        setValue("words", distributed);
      }
    },
  };
}
