import { useId } from "react";

import { Checkbox } from "@renderer/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@renderer/components/ui/field";

/**
 * 带标签的复选框字段的属性.
 */
interface CheckboxFieldProps {
  /**
   * 复选框的标签.
   */
  readonly label: string;
  /**
   * 标签下方的说明, 没有时不显示. 说明挂在复选框的无障碍描述上.
   */
  readonly description?: string;
  /**
   * 是否勾选.
   */
  readonly isChecked: boolean;
  /**
   * 勾选状态变化时的回调.
   */
  readonly onCheckedChange: (isChecked: boolean) => void;
  /**
   * 是否不可改.
   */
  readonly isDisabled?: boolean;
}

/**
 * 带标签与说明的复选框字段: 左边是复选框, 右边是标签与说明, 标签与复选框关联.
 * @param props 组件属性.
 * @returns 复选框字段元素.
 */
export function CheckboxField(props: CheckboxFieldProps): React.JSX.Element {
  const identifier = useId();
  const hasDescription = props.description !== undefined;
  return (
    <Field orientation="horizontal" data-disabled={props.isDisabled}>
      <Checkbox
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
