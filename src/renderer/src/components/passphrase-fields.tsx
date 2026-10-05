import type { PassphrasePairProblem } from "@shared/export/export-limits";

import { PasswordField } from "@renderer/components/password-field";

/**
 * 口令输入字段用到的文案, 由使用方按自己的语境传入.
 */
interface PassphraseFieldsLabels {
  /**
   * 口令输入框的标签.
   */
  readonly passphrase: string;
  /**
   * 确认口令输入框的标签.
   */
  readonly confirmation: string;
  /**
   * 口令输入框下方的说明文字.
   */
  readonly hint: string;
  /**
   * 口令太短时的提示.
   */
  readonly tooShort: string;
  /**
   * 两次输入不一致时的提示.
   */
  readonly mismatch: string;
}

/**
 * 口令输入字段的属性.
 */
interface PassphraseFieldsProps {
  /**
   * 口令输入框的内容.
   */
  readonly passphrase: string;
  /**
   * 确认口令输入框的内容.
   */
  readonly confirmation: string;
  /**
   * 口令现在的问题, 没有问题时为 undefined.
   */
  readonly problem: PassphrasePairProblem | undefined;
  /**
   * 字段用到的文案.
   */
  readonly labels: PassphraseFieldsLabels;
  /**
   * 口令输入框内容改变的回调.
   */
  readonly onPassphraseChange: (value: string) => void;
  /**
   * 确认口令输入框内容改变的回调.
   */
  readonly onConfirmationChange: (value: string) => void;
}

/**
 * 口令与确认口令两个输入框. 口令太短的提示在开始输入口令后出现, 两次不一致的提示在开始输入
 * 确认口令后出现.
 * @param props 组件属性.
 * @returns 两个输入框元素.
 */
export function PassphraseFields(
  props: PassphraseFieldsProps,
): React.JSX.Element {
  const { passphrase, confirmation, problem, labels } = props;
  return (
    <>
      <PasswordField
        label={labels.passphrase}
        description={labels.hint}
        autoComplete="off"
        value={passphrase}
        onChange={(event) => props.onPassphraseChange(event.target.value)}
        error={
          problem === "too-short" && passphrase !== ""
            ? labels.tooShort
            : undefined
        }
      />
      <PasswordField
        label={labels.confirmation}
        autoComplete="off"
        value={confirmation}
        onChange={(event) => props.onConfirmationChange(event.target.value)}
        error={
          problem === "mismatch" && confirmation !== ""
            ? labels.mismatch
            : undefined
        }
      />
    </>
  );
}
