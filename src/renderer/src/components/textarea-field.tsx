import { useId, type ReactNode } from "react";

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
  /**
   * 标签行右侧的操作, 例如格式选择, 没有时标签单独占一行.
   */
  readonly labelAction?: ReactNode;
}

/**
 * 多行文本字段: 标签 (右侧可带一个操作), 多行输入框与错误提示.
 * @param props 组件属性.
 * @returns 多行文本字段元素.
 */
export function TextareaField(props: TextareaFieldProps): React.JSX.Element {
  const { label, error, labelAction, ...textareaProps } = props;
  const identifier = useId();
  const hasError = error !== undefined;
  const fieldLabel = <FieldLabel htmlFor={identifier}>{label}</FieldLabel>;
  return (
    <Field data-invalid={hasError}>
      {labelAction === undefined ? (
        fieldLabel
      ) : (
        <div className="flex items-center justify-between gap-2">
          {fieldLabel}
          {labelAction}
        </div>
      )}
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
