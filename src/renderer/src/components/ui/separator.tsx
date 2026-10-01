import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "cn";

/**
 * 分隔线, 默认横向.
 * @param root0 组件属性, 含 className, orientation 与分隔线原生属性.
 * @returns 分隔线元素.
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props): React.JSX.Element {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
