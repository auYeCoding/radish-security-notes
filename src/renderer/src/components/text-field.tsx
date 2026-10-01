import { useId } from "react";

import { Field, FieldError, FieldLabel } from "@renderer/components/ui/field";
import { Input } from "@renderer/components/ui/input";

/**
 * 文本字段的属性, 除 `id` 外沿用输入框的原生属性, 便于接入表单库.
 */
interface TextFieldProps extends Omit<React.ComponentProps<"input">, "id"> {
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
 * 文本字段: 标签, 输入框与错误提示.
 * @param props 组件属性.
 * @returns 文本字段元素.
 */
export function TextField(props: TextFieldProps): React.JSX.Element {
  const { label, error, ...inputProps } = props;
  const identifier = useId();
  const hasError = error !== undefined;
  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={identifier}>{label}</FieldLabel>
      <Input
        {...inputProps}
        id={identifier}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${identifier}-error` : undefined}
      />
      <FieldError id={`${identifier}-error`}>{error}</FieldError>
    </Field>
  );
}
