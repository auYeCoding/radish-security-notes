import type { ReactNode } from "react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@renderer/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

/**
 * 分段控件里的一个选项.
 */
export interface PreferenceSegmentOption<Value extends string> {
  /**
   * 选项的取值.
   */
  readonly value: Value;
  /**
   * 选项的名称, 同时是按钮的无障碍名称与悬停提示文字.
   */
  readonly label: string;
  /**
   * 按钮上显示的内容, 例如图标或简称. 内容不随界面语言变化, 切换语言时控件宽度不变.
   */
  readonly content: ReactNode;
}

/**
 * 分段控件的属性.
 */
interface PreferenceSegmentsProps<Value extends string> {
  /**
   * 控件的名称, 作为分组的无障碍标签.
   */
  readonly label: string;
  /**
   * 全部选项.
   */
  readonly options: readonly PreferenceSegmentOption<Value>[];
  /**
   * 当前选中的取值.
   */
  readonly value: Value;
  /**
   * 判断一个未知值是否是合法取值的守卫.
   */
  readonly isValue: (candidate: unknown) => candidate is Value;
  /**
   * 选中新取值时的回调. 重复点击已选中的选项不会触发.
   */
  readonly onChange: (value: Value) => void;
}

/**
 * 单选的紧凑分段控件: 一行相连的按钮, 每个按钮带悬停提示, 选中项用主色填充.
 * @param props 组件属性.
 * @returns 分段控件元素.
 */
export function PreferenceSegments<Value extends string>(
  props: PreferenceSegmentsProps<Value>,
): React.JSX.Element {
  return (
    <ToggleGroup
      aria-label={props.label}
      size="sm"
      spacing={0}
      value={[props.value]}
      variant="outline"
      onValueChange={(groupValue) => {
        const [selected] = groupValue;
        if (props.isValue(selected)) {
          props.onChange(selected);
        }
      }}
    >
      {props.options.map((option) => (
        <Tooltip key={option.value}>
          <TooltipTrigger
            render={
              <ToggleGroupItem
                aria-label={option.label}
                className="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                value={option.value}
              />
            }
          >
            {option.content}
          </TooltipTrigger>
          <TooltipContent>{option.label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
