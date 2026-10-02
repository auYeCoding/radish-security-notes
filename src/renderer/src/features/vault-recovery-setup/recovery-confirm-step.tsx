import { useTranslation } from "react-i18next";

import { TextField } from "@renderer/components/text-field";
import { Button } from "@renderer/components/ui/button";
import { Field, FieldGroup } from "@renderer/components/ui/field";

import { useRecoveryConfirmation } from "./use-recovery-confirmation";

/**
 * 确认步骤的属性.
 */
interface RecoveryConfirmStepProps {
  /**
   * 完整的 24 个恢复词, 用来核对用户重输的词.
   */
  readonly words: readonly string[];
  /**
   * 被要求重输的词的序号 (从 1 起), 升序.
   */
  readonly positions: readonly number[];
  /**
   * 点击 "返回再看一遍" 时的回调.
   */
  readonly onBack: () => void;
  /**
   * 重输全部答对时的回调.
   */
  readonly onConfirmed: () => void;
}

/**
 * 恢复词确认步骤: 词已隐藏, 要求重输随机抽出的几个词. 答错时只在对应输入框下方指出哪个位置
 * 不对, 不显示正确的词, 可以反复尝试, 也可以返回再看一遍.
 * @param props 组件属性.
 * @returns 确认步骤元素.
 */
export function RecoveryConfirmStep(
  props: RecoveryConfirmStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { register, submit, errorOf } = useRecoveryConfirmation(
    props.words,
    props.positions,
    props.onConfirmed,
  );
  return (
    <form noValidate onSubmit={submit}>
      <FieldGroup>
        {props.positions.map((position, index) => (
          <TextField
            key={position}
            {...register(`answers.${index}`)}
            label={t("vault.recovery.wordLabel", { position })}
            className="font-mono"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            error={errorOf(index)}
          />
        ))}
        <Field>
          <Button type="submit">{t("vault.recovery.confirm.submit")}</Button>
          <Button type="button" variant="secondary" onClick={props.onBack}>
            {t("vault.recovery.confirm.back")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
