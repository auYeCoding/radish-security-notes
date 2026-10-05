import { useId } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@renderer/components/ui/field";
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
   * 标签下方的说明文字, 没有时不显示.
   */
  readonly description?: string;
  /**
   * 校验错误或操作错误的文字, 有值时输入框标红并在下方显示.
   */
  readonly error?: string;
}

/**
 * 计算输入框的 `aria-describedby`: 有错误时指向错误, 否则指向说明.
 * @param identifier 字段的标识前缀.
 * @param hasError 是否有错误.
 * @param hasDescription 是否有说明.
 * @returns 要引用的元素标识, 都没有时为 undefined.
 */
function describedByOf(
  identifier: string,
  hasError: boolean,
  hasDescription: boolean,
): string | undefined {
  if (hasError) {
    return `${identifier}-error`;
  }
  return hasDescription ? `${identifier}-description` : undefined;
}

/**
 * 文本字段: 标签, 输入框, 说明与错误提示.
 * @param props 组件属性.
 * @returns 文本字段元素.
 */
export function TextField(props: TextFieldProps): React.JSX.Element {
  const { label, description, error, ...inputProps } = props;
  const identifier = useId();
  const hasError = error !== undefined;
  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={identifier}>{label}</FieldLabel>
      <Input
        {...inputProps}
        id={identifier}
        aria-invalid={hasError}
        aria-describedby={describedByOf(
          identifier,
          hasError,
          description !== undefined,
        )}
      />
      {description !== undefined && (
        <FieldDescription id={`${identifier}-description`}>
          {description}
        </FieldDescription>
      )}
      <FieldError id={`${identifier}-error`}>{error}</FieldError>
    </Field>
  );
}
