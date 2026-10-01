import { useId, useState } from "react";

import { RevealToggleButton } from "@renderer/components/reveal-toggle-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@renderer/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@renderer/components/ui/input-group";

/**
 * 密码输入字段的属性, 除 `type` 与 `id` 外沿用输入框的原生属性, 便于接入表单库.
 */
interface PasswordFieldProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "id"
> {
  /**
   * 字段标签.
   */
  readonly label: string;
  /**
   * 标签下方的说明文字, 例如最短长度.
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
 * 密码字段: 标签, 带显示与隐藏切换的输入框, 说明和错误提示.
 * @param props 组件属性.
 * @returns 密码字段元素.
 */
export function PasswordField(props: PasswordFieldProps): React.JSX.Element {
  const { label, description, error, ...inputProps } = props;
  const identifier = useId();
  const [isRevealed, setIsRevealed] = useState(false);
  const hasError = error !== undefined;
  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={identifier}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          {...inputProps}
          id={identifier}
          className="text-foreground"
          type={isRevealed ? "text" : "password"}
          aria-invalid={hasError}
          aria-describedby={describedByOf(
            identifier,
            hasError,
            description !== undefined,
          )}
        />
        <InputGroupAddon align="inline-end">
          <RevealToggleButton
            isRevealed={isRevealed}
            onToggle={() => setIsRevealed(!isRevealed)}
          />
        </InputGroupAddon>
      </InputGroup>
      {description !== undefined && (
        <FieldDescription id={`${identifier}-description`}>
          {description}
        </FieldDescription>
      )}
      <FieldError id={`${identifier}-error`}>{error}</FieldError>
    </Field>
  );
}
