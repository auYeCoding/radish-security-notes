import * as React from "react";
import { cn } from "cn";

/**
 * 表单标签, 通过 `htmlFor` 或嵌套与控件关联. 显式声明 `htmlFor` 与 `children`,
 * 让可访问性检查能看出标签的关联与文字.
 * @param root0 组件属性, 含 className, htmlFor, children 与标签原生属性.
 * @returns 标签元素.
 */
function Label({
  className,
  htmlFor,
  children,
  ...props
}: React.ComponentProps<"label">): React.JSX.Element {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };
