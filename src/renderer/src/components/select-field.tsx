import { useId, type ReactNode } from "react";

import { Field, FieldLabel } from "@renderer/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";

/**
 * 下拉的一个选项.
 */
export interface SelectFieldItem {
  /**
   * 选项的取值.
   */
  readonly value: string;
  /**
   * 选项显示的文字.
   */
  readonly label: string;
}

/**
 * 带标签的下拉字段的属性.
 */
interface SelectFieldProps {
  /**
   * 下拉的标签, 也是下拉的无障碍名称.
   */
  readonly label: string;
  /**
   * 全部选项.
   */
  readonly items: readonly SelectFieldItem[];
  /**
   * 当前选的取值.
   */
  readonly value: string;
  /**
   * 选了别的选项时的回调.
   */
  readonly onChange: (value: string) => void;
  /**
   * 是否不可改.
   */
  readonly isDisabled?: boolean;
  /**
   * 放在标签行右端的内容, 例如一个开关; 没有时标签行只有标签.
   */
  readonly labelAction?: ReactNode;
}

/**
 * 带标签的下拉字段: 标签在上, 下拉占满一行, 标签是下拉的无障碍名称. 给了 `labelAction` 时它与标签
 * 在同一行, 靠右对齐.
 * @param props 组件属性.
 * @returns 下拉字段元素.
 */
export function SelectField(props: SelectFieldProps): React.JSX.Element {
  const labelIdentifier = useId();
  const label = <FieldLabel id={labelIdentifier}>{props.label}</FieldLabel>;
  return (
    <Field>
      {props.labelAction === undefined ? (
        label
      ) : (
        <div className="flex items-center justify-between gap-3">
          {label}
          {props.labelAction}
        </div>
      )}
      <Select
        items={props.items}
        value={props.value}
        disabled={props.isDisabled}
        onValueChange={(value) => {
          if (typeof value === "string") {
            props.onChange(value);
          }
        }}
      >
        <SelectTrigger aria-labelledby={labelIdentifier} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {props.items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
