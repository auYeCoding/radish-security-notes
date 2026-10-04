import { Checkbox } from "@renderer/components/ui/checkbox";

import type { MarkdownElementProps } from "./markdown-element-props";

/**
 * 任务列表项前的复选框: 只读, 按列表项原文显示已勾选或未勾选, 不能在详情里点选. 不是复选框的输入
 * 不渲染.
 * @param props 组件属性.
 * @returns 只读复选框元素, 或 null.
 */
export function MarkdownTaskCheckbox(
  props: MarkdownElementProps<"input">,
): React.JSX.Element | null {
  if (props.type !== "checkbox") {
    return null;
  }
  return (
    <Checkbox
      disabled
      checked={props.checked === true}
      className="mr-1.5 inline-flex align-middle"
    />
  );
}
