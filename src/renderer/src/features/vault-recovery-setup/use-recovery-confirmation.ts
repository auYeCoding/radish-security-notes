import { useEffect, type FormEvent } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { findWrongPositions } from "./recovery-challenge";

/**
 * 确认表单的取值.
 */
export interface ConfirmationFormValues {
  /**
   * 用户按被要求的序号顺序填写的答案.
   */
  answers: string[];
}

/**
 * 确认表单交给界面使用的部分.
 */
export interface RecoveryConfirmation {
  /**
   * 接入输入框的注册函数.
   */
  readonly register: UseFormRegister<ConfirmationFormValues>;
  /**
   * 提交表单的处理函数.
   */
  readonly submit: (event: FormEvent<HTMLFormElement>) => void;
  /**
   * 第几个答案的错误文案 (从 0 起), 没有错误时为 undefined.
   */
  readonly errorOf: (index: number) => string | undefined;
}

/**
 * 管理恢复词确认表单: 提交时核对答案, 全部答对调用回调, 答错的位置在对应输入框下方提示.
 * 页面出现时第一个输入框自动获得焦点.
 * @param words 完整的 24 个恢复词.
 * @param positions 被要求重输的序号 (从 1 起).
 * @param onConfirmed 全部答对时的回调.
 * @returns 表单的注册函数, 提交处理函数与错误读取函数.
 */
export function useRecoveryConfirmation(
  words: readonly string[],
  positions: readonly number[],
  onConfirmed: () => void,
): RecoveryConfirmation {
  const { t } = useTranslation();
  const { register, handleSubmit, setError, setFocus, formState } =
    useForm<ConfirmationFormValues>({
      defaultValues: { answers: positions.map(() => "") },
    });
  useEffect(() => {
    setFocus("answers.0");
  }, [setFocus]);
  const check = (values: ConfirmationFormValues): void => {
    const wrongPositions = findWrongPositions(words, positions, values.answers);
    if (wrongPositions.length === 0) {
      onConfirmed();
      return;
    }
    positions.forEach((position, index) => {
      if (wrongPositions.includes(position)) {
        setError(`answers.${index}`, {
          message: t("vault.recovery.confirm.wrongWord", { position }),
        });
      }
    });
  };
  return {
    register,
    submit: (event) => void handleSubmit(check)(event),
    errorOf: (index) => formState.errors.answers?.[index]?.message,
  };
}
