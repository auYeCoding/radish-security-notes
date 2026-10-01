import { useId } from "react";

import { Field, FieldError, FieldLabel } from "@renderer/components/ui/field";
import { Textarea } from "@renderer/components/ui/textarea";

/**
 * 多行文本字段的属性, 除 `id` 外沿用多行输入框的原生属性, 便于接入表单库.
 */
interface TextareaFieldProps extends Omit<
  React.ComponentProps<"textarea">,
  "id"
> {
  /**
   * 字段标签.
   */
  readonly label: string;
  /**
   * 校验错误或操作错误的文字, 有值时输入框标红并在下方显示.
   */
  readonly error?: string;
}

/**
 * 多行文本字段: 标签, 多行输入框与错误提示.
 * @param props 组件属性.
 * @returns 多行文本字段元素.
 */
export function TextareaField(props: TextareaFieldProps): React.JSX.Element {
  const { label, error, ...textareaProps } = props;
  const identifier = useId();
  const hasError = error !== undefined;
  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={identifier}>{label}</FieldLabel>
      <Textarea
        {...textareaProps}
        id={identifier}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${identifier}-error` : undefined}
      />
      <FieldError id={`${identifier}-error`}>{error}</FieldError>
    </Field>
  );
}
