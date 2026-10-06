import { useId } from "react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@renderer/components/ui/field";
import { Switch } from "@renderer/components/ui/switch";

/**
 * 带标签的开关字段的属性.
 */
interface SwitchFieldProps {
  /**
   * 开关的标签.
   */
  readonly label: string;
  /**
   * 标签下方的说明, 没有时不显示. 说明挂在开关的无障碍描述上.
   */
  readonly description?: string;
  /**
   * 开关是否打开.
   */
  readonly isChecked: boolean;
  /**
   * 开关状态变化时的回调.
   */
  readonly onCheckedChange: (isChecked: boolean) => void;
  /**
   * 是否不可改.
   */
  readonly isDisabled?: boolean;
}

/**
 * 带标签与说明的开关字段: 左边是开关, 右边是标签与说明, 标签与开关关联.
 * @param props 组件属性.
 * @returns 开关字段元素.
 */
export function SwitchField(props: SwitchFieldProps): React.JSX.Element {
  const identifier = useId();
  const hasDescription = props.description !== undefined;
  return (
    <Field orientation="horizontal" data-disabled={props.isDisabled}>
      <Switch
        id={identifier}
        checked={props.isChecked}
        disabled={props.isDisabled}
        onCheckedChange={props.onCheckedChange}
        aria-describedby={
          hasDescription ? `${identifier}-description` : undefined
        }
      />
      <FieldContent>
        <FieldLabel htmlFor={identifier}>{props.label}</FieldLabel>
        {hasDescription && (
          <FieldDescription id={`${identifier}-description`}>
            {props.description}
          </FieldDescription>
        )}
      </FieldContent>
    </Field>
  );
}
